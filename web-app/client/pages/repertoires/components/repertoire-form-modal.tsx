import { useState, type ReactElement, type SubmitEvent } from 'react';

import { TrackSearchModal } from './track-search-modal';
import { repertoirePartNames, repertoirePartValues, repertoireProficiencyNames, repertoireProficiencyValues } from '../../../../shared/constants/repertoire-constants';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { editRepertoireSchema } from '../../../../shared/schemas/repertoire-schema';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useRepertoiresStore } from '../../../stores/repertoires-store';
import { useTracksStore } from '../../../stores/tracks-store';

import type { RepertoireListItem } from '../../../../shared/types/repertoire';
import type { TrackListItem } from '../../../../shared/types/track';
import type { Result } from '../../../../shared/types/utilities/result';

type Props = {
  /** 編集対象のレパートリー・未指定 `null` の場合は新規作成 */
  repertoire: RepertoireListItem | null;
  /** モーダルを閉じた時の処理 */
  onClose: () => void;
};

/** フォーム入力の型 */
type RepertoireInput = Record<'track_id' | 'artist' | 'album' | 'title' | 'part' | 'proficiency' | 'memo', string>;

/** レパートリーの新規登録・編集フォームモーダル */
export const RepertoireFormModal = ({ repertoire, onClose }: Props): ReactElement => {
  const [input, setInput] = useState<RepertoireInput>(() => ({  // 入力中の値・未入力や未選択は空文字
    track_id   : repertoire?.track_id?.toString() ?? '',
    artist     : repertoire?.artist               ?? '',
    album      : repertoire?.album                ?? '',
    title      : repertoire?.title                ?? '',
    part       : repertoire?.part                 ?? '',
    proficiency: repertoire?.proficiency          ?? '',
    memo       : repertoire?.memo                 ?? ''
  }));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // 処理中か否か
  const [error       , setError       ] = useState<string>('');      // エラーメッセージ
  const [track       , setTrack       ] = useState<RepertoireListItem['track']>(() => useTracksStore.getState().tracks.find(item => item.id === repertoire?.track_id) ?? null);  // 紐付く楽曲があれば初期取得しておく
  
  const [isTrackSearchOpen, setIsTrackSearchOpen] = useState<boolean>(false);  // 楽曲選択モーダルを表示中か否か
  const [trackError       , setTrackError       ] = useState<string>('');      // 楽曲確認時のエラーメッセージ
  
  /** ID 入力欄を離れた時に Store から紐付く楽曲を取得する */
  const onBlurTrackId = (): void => {
    setTrackError('');
    
    const parsed = editRepertoireSchema.shape.track_id.safeParse(input.track_id);
    if(!parsed.success) {
      setTrack(null);
      setTrackError(mergeIssues(parsed.error));
      return;
    }
    if(parsed.data == null) return setTrack(null);
    
    const foundTrack = useTracksStore.getState().tracks.find(item => item.id === parsed.data) ?? null;
    setTrack(foundTrack);
    if(foundTrack == null) setTrackError('該当する楽曲が見つかりません');
  };
  
  /** モーダルから選択した楽曲を紐付け先に反映する */
  const onSelectTrack = (selectedTrack: TrackListItem): void => {
    setInput(current => ({ ...current, track_id: selectedTrack.id.toString() }));  // ID のみ紐付け・メタデータの転記は「転記」ボタンで任意に行う
    setTrack(selectedTrack);
    setTrackError('');
    setIsTrackSearchOpen(false);
  };
  
  /** 「転記」ボタン押下時 */
  const onCopyTrack = (): void => {
    if(track == null) return;
    setInput(current => ({ ...current, artist: track.artist ?? '', album: track.album ?? '', title: track.title }));
  };
  
  /** レパートリーを登録 or 編集する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting) return;
    
    const parsed = editRepertoireSchema.safeParse(input);
    if(!parsed.success) return setError(mergeIssues(parsed.error));
    
    setError('');
    setIsSubmitting(true);
    try {
      const result = repertoire == null
        ? await adminApi.post('/api/repertoires', { json: parsed.data }).json<Result<number>>()
        : await adminApi.put(`/api/repertoires/${repertoire.id}`, { json: parsed.data }).json<Result<true>>();
      if(result.error != null) return setError(result.error);
      
      // 紐付く楽曲をチェックして Store に保存する
      const linkedTrack = parsed.data.track_id == null ? null
        : useTracksStore.getState().tracks.find(item => item.id === parsed.data.track_id)
          ?? (track?.id === parsed.data.track_id ? track : null)
          ?? (repertoire?.track?.id === parsed.data.track_id ? repertoire.track : null);
      const upsertedRepertoire: RepertoireListItem = {
        ...repertoire,
        ...parsed.data,
        id: repertoire == null ? result.result as number : repertoire.id,
        track: linkedTrack == null ? null : {
          id    : linkedTrack.id,
          artist: linkedTrack.artist,
          album : linkedTrack.album,
          title : linkedTrack.title
        }
      };
      useRepertoiresStore.getState().upsertRepertoire(upsertedRepertoire);
      onClose();
    }
    catch(error) {
      setError(extractApiErrorMessage(error, 'レパートリーの保存に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** レパートリーを削除する */
  const onDelete = async (): Promise<void> => {
    if(repertoire == null || isSubmitting) return;
    if(!window.confirm('このレパートリーを削除しますか？')) return;
    
    setError('');
    setIsSubmitting(true);
    try {
      const result = await adminApi.delete(`/api/repertoires/${repertoire.id}`).json<Result<true>>();
      if(result.error != null) return setError(result.error);
      
      useRepertoiresStore.getState().removeRepertoire(repertoire.id);
      onClose();
    }
    catch(error) {
      setError(extractApiErrorMessage(error, 'レパートリーの削除に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <>
      <div className="modal modal-open" inert={isTrackSearchOpen}>
        <div className="modal-box max-w-4xl p-4">
          <h2 className="mb-4 text-lg font-bold">レパートリーを{repertoire == null ? '登録する' : '編集する'}</h2>
          
          <form onSubmit={onSubmit}>
            <fieldset className="mb-4 fieldset" disabled={isSubmitting}>
              <label className="fieldset-label">トラック ID</label>
              <div className="grid grid-cols-[1fr_auto] gap-x-2">
                <input type="text" className="input w-full input-sm" inputMode="numeric"
                  value={input.track_id}
                  onChange={event => {
                    setInput(current => ({ ...current, track_id: event.target.value }));
                    setTrack(null);
                    setTrackError('');
                  }}
                  onBlur={onBlurTrackId} />
                <button type="button" className="btn btn-sm" onClick={() => setIsTrackSearchOpen(true)}>検索</button>
              </div>
              
              {track != null && (
                <div className="grid grid-cols-[1fr_auto] gap-x-2">
                  <p className="text-xs text-gray-500">{track.artist} - {track.album} : {track.title}</p>
                  <button type="button" className="btn btn-xs" onClick={onCopyTrack}>転記</button>
                </div>
              )}
              
              {!isEmpty(trackError) && (
                <p className="text-error">{trackError}</p>
              )}
              
              <label className="fieldset-label">アーティスト</label>
              <input type="text" className="input w-full input-sm" value={input.artist} onChange={event => setInput(current => ({ ...current, artist: event.target.value }))} />
              
              <label className="fieldset-label">アルバム</label>
              <input type="text" className="input w-full input-sm" value={input.album} onChange={event => setInput(current => ({ ...current, album: event.target.value }))} />
              
              <label className="fieldset-label">曲名</label>
              <input type="text" className="input w-full input-sm" value={input.title} onChange={event => setInput(current => ({ ...current, title: event.target.value }))} />
              
              <label className="fieldset-label">パート</label>
              <select className="select w-full select-sm" value={input.part} onChange={event => setInput(current => ({ ...current, part: event.target.value }))}>
                <option value="">選択してください</option>
                {repertoirePartValues.map(part => (
                  <option key={part} value={part}>{repertoirePartNames[part]}</option>
                ))}
              </select>
              
              <label className="fieldset-label">習熟度</label>
              <select className="select w-full select-sm" value={input.proficiency} onChange={event => setInput(current => ({ ...current, proficiency: event.target.value }))}>
                <option value="">未選択</option>
                {repertoireProficiencyValues.map(proficiency => (
                  <option key={proficiency} value={proficiency}>{repertoireProficiencyNames[proficiency]}</option>
                ))}
              </select>
              
              <label className="fieldset-label">メモ</label>
              <textarea className="textarea w-full textarea-sm" rows={8} value={input.memo} onChange={event => setInput(current => ({ ...current, memo: event.target.value }))} />
            </fieldset>
            
            {!isEmpty(error) && (
              <div className="mb-4 alert alert-soft alert-error">{error}</div>
            )}
            
            <div className="modal-action justify-between">
              <button type="button" className="btn btn-sm" disabled={isSubmitting} onClick={onClose}>キャンセル</button>
              {repertoire != null && (
                <button type="button" className="btn btn-error btn-sm" disabled={isSubmitting} onClick={onDelete}>削除</button>
              )}
              <button type="submit" className="btn btn-info btn-sm" disabled={isSubmitting}>{repertoire == null ? '登録する' : '変更する'}</button>
            </div>
          </form>
        </div>
      </div>
      
      {isTrackSearchOpen && (
        <TrackSearchModal onSelect={onSelectTrack} onClose={() => setIsTrackSearchOpen(false)} />
      )}
    </>
  );
};
