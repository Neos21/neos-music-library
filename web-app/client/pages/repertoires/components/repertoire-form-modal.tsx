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
  repertoire: RepertoireListItem | null;
  onClose: () => void;
};

type RepertoireInput = Record<'track_id' | 'artist' | 'album' | 'title' | 'part' | 'proficiency' | 'memo', string>;

/** 新規登録と編集で共通のレパートリーフォーム */
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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // 保存・削除処理中か否か
  const [error, setError] = useState<string>('');                    // 保存・削除エラー・空文字はエラーなし
  const [track, setTrack] = useState<RepertoireListItem['track']>(() => useTracksStore.getState().tracks.find(item => item.id === repertoire?.track_id) ?? null);  // 確認済みの楽曲・未確認や未紐付けは `null`
  const [trackError, setTrackError] = useState<string>('');  // 楽曲確認エラー・空文字はエラーなし
  
  const [isTrackSearchOpen, setIsTrackSearchOpen] = useState<boolean>(false);  // 楽曲選択モーダルを表示中か否か
  
  /** 入力欄を離れた時に Store 内の楽曲を確認する */
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
  
  /** 選択した楽曲を紐付け先に反映し、各メタデータの入力は保持する */
  const onSelectTrack = (selectedTrack: TrackListItem): void => {
    setInput(current => ({ ...current, track_id: selectedTrack.id.toString() }));
    setTrack(selectedTrack);
    setTrackError('');
    setIsTrackSearchOpen(false);
  };
  
  /** 楽曲情報は転記を選んだ時だけ入力欄に反映する */
  const onCopyTrack = (): void => {
    if(track == null) return;
    setInput(current => ({ ...current, artist: track.artist ?? '', album: track.album ?? '', title: track.title }));
  };
  
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSubmitting) return;
    
    const parsed = editRepertoireSchema.safeParse(input);
    if(!parsed.success) return setError(mergeIssues(parsed.error));
    
    setError('');
    setIsSubmitting(true);
    try {
      const response = repertoire == null
        ? await adminApi.post('/api/repertoires', { json: parsed.data }).json<Result<RepertoireListItem>>()
        : await adminApi.put(`/api/repertoires/${repertoire.id}`, { json: parsed.data }).json<Result<RepertoireListItem>>();
      if(response.error != null) return setError(response.error);
      
      useRepertoiresStore.getState().upsertRepertoire(response.result);
      onClose();
    }
    catch(error) {
      setError(extractApiErrorMessage(error, 'レパートリーの保存に失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  const onDelete = async (): Promise<void> => {
    if(repertoire == null || isSubmitting) return;
    if(!window.confirm('このレパートリーを削除しますか？')) return;
    
    setError('');
    setIsSubmitting(true);
    try {
      const response = await adminApi.delete(`/api/repertoires/${repertoire.id}`).json<Result<{ id: number; }>>();
      if(response.error != null) return setError(response.error);
      
      useRepertoiresStore.getState().removeRepertoire(response.result.id);
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
              <div className="flex gap-2">
                <input type="text" className="input w-full input-sm" inputMode="numeric"
                  value={input.track_id}
                  onChange={event => {
                    setInput(current => ({ ...current, track_id: event.target.value }));
                    setTrack(null);
                    setTrackError('');
                  }}
                  onBlur={onBlurTrackId} />
                <button className="btn btn-sm" type="button" onClick={() => setIsTrackSearchOpen(true)}>検索</button>
              </div>
              {track != null && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{track.artist} - {track.album} : {track.title}</p>
                  <button className="btn shrink-0 btn-xs" type="button" onClick={onCopyTrack}>転記</button>
                </div>
              )}
              {!isEmpty(trackError) && (
                <p className="text-error">{trackError}</p>
              )}
              
              {(['artist', 'album', 'title'] as const).map(field => (
                <div key={field}>
                  <label className="fieldset-label">{({ artist: 'アーティスト', album: 'アルバム', title: '曲名' })[field]}</label>
                  <input className="input w-full input-sm" type="text" value={input[field]} onChange={event => setInput(current => ({ ...current, [field]: event.target.value }))} />
                </div>
              ))}
              
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
              <button className="btn" type="button" disabled={isSubmitting} onClick={onClose}>キャンセル</button>
              {repertoire != null && (
                <button className="btn btn-error" type="button" disabled={isSubmitting} onClick={onDelete}>削除</button>
              )}
              <button className="btn btn-info" type="submit" disabled={isSubmitting}>{repertoire == null ? '登録する' : '変更する'}</button>
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
