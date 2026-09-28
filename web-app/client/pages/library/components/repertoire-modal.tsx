import { useState, type ReactElement, type SubmitEvent } from 'react';

import { repertoirePartNames, repertoirePartValues, repertoireProficiencyNames, repertoireProficiencyValues } from '../../../../shared/constants/repertoire-constants';
import { repertoireLinkTypeNames, repertoireLinkTypeValues } from '../../../../shared/constants/repertoire-link-constants';
import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createRepertoireSchema, updateRepertoireSchema } from '../../../../shared/schemas/repertoire-schema';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { LibraryRepertoire, LibraryTrack } from '../../../../shared/types/app/library-track';

type Props = {
  libraryTrack: LibraryTrack | null;
  libraryTracks?: Array<LibraryTrack>;
  repertoire?: LibraryRepertoire | null;
  onClose: () => void;
  onSaved: () => void;
};

type RepertoireInput = {
  artist: string;
  album: string;
  title: string;
  part: string;
  proficiency: string;
  memo: string;
};

type RepertoireLinkInput = {
  rowId: number;
  type: string;
  url: string;
  title: string;
  memo: string;
};

const newRepertoireLinkInput = (rowId: number): RepertoireLinkInput => ({ rowId, type: '', url: '', title: '', memo: '' });

/** 編集時はレパートリー、登録時は楽曲の値を初期値にする */
const newRepertoireInput = (source: Pick<LibraryTrack, 'artist' | 'album' | 'title'> | null, repertoire: LibraryRepertoire | null): RepertoireInput => ({
  artist     : source?.artist ?? '',
  album      : source?.album ?? '',
  title      : source?.title ?? '',
  part       : repertoire?.part ?? '',
  proficiency: repertoire?.proficiency ?? '',
  memo       : repertoire?.memo ?? ''
});

/** 既存レパートリーリンクを入力行に変換し、最低3行を用意する */
const newRepertoireLinkInputs = (repertoire: LibraryRepertoire | null): Array<RepertoireLinkInput> => {
  const repertoireLinks = repertoire?.repertoire_links.map((repertoireLink, rowId) => ({
    rowId,
    type : repertoireLink.type,
    url  : repertoireLink.url,
    title: repertoireLink.title,
    memo : repertoireLink.memo ?? ''
  })) ?? [];
  return Array.from({ length: Math.max(3, repertoireLinks.length) }, (_, rowId) => repertoireLinks[rowId] ?? newRepertoireLinkInput(rowId));
};

/** レパートリーの登録・編集モーダル */
export const RepertoireModal = ({ libraryTrack, libraryTracks = [], repertoire = null, onClose, onSaved }: Props): ReactElement => {
  const [repertoireInput     , setRepertoireInput     ] = useState<RepertoireInput>(() => newRepertoireInput(repertoire ?? libraryTrack, repertoire));  // レパートリーの入力値・未選択の項目は空文字
  const [repertoireLinkInputs, setRepertoireLinkInputs] = useState<Array<RepertoireLinkInput>>(() => newRepertoireLinkInputs(repertoire));              // レパートリーリンク入力行
  
  const [searchTrackId   , setSearchTrackId   ] = useState<string>('');                 // 楽曲検索欄の入力値・空文字は未入力
  const [searchTrackError, setSearchTrackError] = useState<string>('');                 // 楽曲検索失敗時のエラーメッセージ・空文字はエラーなし
  const [selectedTrack   , setSelectedTrack   ] = useState<LibraryTrack | null>(null);  // 検索で確定した紐付け対象・`null` は未選択
  
  const [isSaving , setIsSaving ] = useState<boolean>(false);  // 登録・更新・削除処理中か否か
  const [saveError, setSaveError] = useState<string>('');      // 処理に失敗した場合のエラーメッセージ
  
  /** レパートリー入力欄の項目を更新する */
  const onChangeRepertoire = (field: keyof RepertoireInput, value: string): void => {
    setRepertoireInput(currentRepertoireInput => ({ ...currentRepertoireInput, [field]: value }));
  };
  
  /** 指定したレパートリーリンク入力行の項目を更新する */
  const onChangeRepertoireLink = (index: number, field: Exclude<keyof RepertoireLinkInput, 'rowId'>, value: string): void => {
    setRepertoireLinkInputs(currentRepertoireLinkInputs => currentRepertoireLinkInputs.map((currentRepertoireLinkInput, currentIndex) => currentIndex === index ? { ...currentRepertoireLinkInput, [field]: value } : currentRepertoireLinkInput));
  };
  
  /** 入力されたトラック ID をライブラリ一覧から探し、紐付け対象として確定する */
  const onSearchTrack = (): void => {
    const trackId = Number(searchTrackId);
    const track = Number.isInteger(trackId) && trackId > 0 ? libraryTracks.find(libraryTrack => libraryTrack.id === trackId) : null;
    if(track == null) {
      setSelectedTrack(null);
      return setSearchTrackError('指定されたトラック ID の楽曲が見つかりませんでした');
    }
    setSelectedTrack(track);
    setSearchTrackError('');
  };
  
  /** レパートリーを登録または更新する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSaving) return;
    
    const input = { ...repertoireInput, repertoire_links: repertoireLinkInputs };
    const parsed = repertoire == null
      ? createRepertoireSchema.safeParse({ track_id: libraryTrack?.id ?? null, ...input })
      : updateRepertoireSchema.safeParse({ ...input, ...(selectedTrack == null ? {} : { track_id: selectedTrack.id }) });
    if(!parsed.success) return setSaveError(mergeIssues(parsed.error));
    
    setIsSaving(true);
    setSaveError('');
    try {
      if(repertoire == null) {
        await adminApi.post('/api/repertoires', { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      else {
        await adminApi.put(`/api/repertoires/${repertoire.id}`, { json: parsed.data }).json<{ result: { id: number; }; }>();
      }
      onClose();
      onSaved();
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, repertoire == null ? 'レパートリーの登録に失敗しました' : 'レパートリーの更新に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  /** レパートリーを削除する */
  const onDelete = async (): Promise<void> => {
    if(repertoire == null || isSaving) return;
    if(!window.confirm('このレパートリーを削除しますか？')) return;
    
    setIsSaving(true);
    setSaveError('');
    try {
      await adminApi.delete(`/api/repertoires/${repertoire.id}`).json<{ result: { id: number; }; }>();
      onClose();
      onSaved();
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, 'レパートリーの削除に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">レパートリーを{repertoire == null ? '登録' : '編集'}する</h2>
        
        <form onSubmit={onSubmit}>
          {libraryTrack != null && (
            <>
              <h3 className="mb-2 font-bold">紐付く楽曲</h3>
              <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt>トラック ID</dt>
                <dd>{libraryTrack.id}</dd>
                <dt>アーティスト名</dt>
                <dd>{libraryTrack.artist}</dd>
                <dt>アルバム名</dt>
                <dd>{libraryTrack.album}</dd>
                <dt>トラック番号</dt>
                <dd>{libraryTrack.track_number === 0 ? '-' : libraryTrack.track_number}</dd>
                <dt>曲名</dt>
                <dd>{libraryTrack.title}</dd>
              </dl>
            </>
          )}
          
          {libraryTrack == null && repertoire != null && (
            <>
              <h3 className="mb-2 font-bold">楽曲を紐付ける</h3>
              <div className="mb-4 flex gap-2">
                <label className="flex flex-col gap-1">トラック ID
                  <input className="input" type="text" inputMode="numeric" value={searchTrackId} disabled={isSaving} onChange={event => { setSearchTrackId(event.target.value); setSearchTrackError(''); }} />
                </label>
                <button className="btn self-end" type="button" disabled={isSaving} onClick={onSearchTrack}>検索</button>
              </div>
              
              {!isEmpty(searchTrackError) && (
                <div className="mb-4 alert alert-error">{searchTrackError}</div>
              )}
              
              {selectedTrack != null && (
                <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  <dt>トラック ID</dt>
                  <dd>{selectedTrack.id}</dd>
                  <dt>アーティスト名</dt>
                  <dd>{selectedTrack.artist}</dd>
                  <dt>アルバム名</dt>
                  <dd>{selectedTrack.album}</dd>
                  <dt>トラック番号</dt>
                  <dd>{selectedTrack.track_number === 0 ? '-' : selectedTrack.track_number}</dd>
                  <dt>曲名</dt>
                  <dd>{selectedTrack.title}</dd>
                </dl>
              )}
            </>
          )}
          
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">アーティスト名
              <input className="input w-full" value={repertoireInput.artist} disabled={isSaving} onChange={event => onChangeRepertoire('artist', event.target.value)} />
            </label>
            
            <label className="flex flex-col gap-1">アルバム名
              <input className="input w-full" value={repertoireInput.album} disabled={isSaving} onChange={event => onChangeRepertoire('album', event.target.value)} />
            </label>
            
            <label className="flex flex-col gap-1">曲名
              <input className="input w-full" value={repertoireInput.title} disabled={isSaving} onChange={event => onChangeRepertoire('title', event.target.value)} />
            </label>
            
            <label className="flex flex-col gap-1">パート
              <select className="select w-full" value={repertoireInput.part} disabled={isSaving} onChange={event => onChangeRepertoire('part', event.target.value)}>
                <option value="">選択してください</option>
                {repertoirePartValues.map(value => (<option key={value} value={value}>{repertoirePartNames[value]}</option>))}
              </select>
            </label>
            
            <label className="flex flex-col gap-1">習熟度
              <select className="select w-full" value={repertoireInput.proficiency} disabled={isSaving} onChange={event => onChangeRepertoire('proficiency', event.target.value)}>
                <option value="">未選択</option>
                {repertoireProficiencyValues.map(value => (<option key={value} value={value}>{repertoireProficiencyNames[value]}</option>))}
              </select>
            </label>
            
            <label className="flex flex-col gap-1 sm:col-span-2">メモ
              <textarea className="textarea w-full" value={repertoireInput.memo} disabled={isSaving} rows={3} onChange={event => onChangeRepertoire('memo', event.target.value)} />
            </label>
          </div>
          
          <h3 className="mb-2 font-bold">レパートリーリンク</h3>
          <div className="mb-2 overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>種別</th>
                  <th>URL</th>
                  <th>タイトル</th>
                  <th>メモ</th>
                  <th>行削除</th>
                </tr>
              </thead>
              <tbody>
                {repertoireLinkInputs.map((repertoireLinkInput, index) => (
                  <tr key={repertoireLinkInput.rowId}>
                    <td>
                      <select className="select min-w-32 select-sm" value={repertoireLinkInput.type} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'type', event.target.value)}>
                        <option value="">未選択</option>
                        {repertoireLinkTypeValues.map(value => (<option key={value} value={value}>{repertoireLinkTypeNames[value]}</option>))}
                      </select>
                    </td>
                    <td><input className="input min-w-48 input-sm" value={repertoireLinkInput.url} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'url', event.target.value)} /></td>
                    <td><input className="input min-w-40 input-sm" value={repertoireLinkInput.title} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'title', event.target.value)} /></td>
                    <td><textarea className="textarea min-w-40 textarea-sm" value={repertoireLinkInput.memo} disabled={isSaving} rows={2} onChange={event => onChangeRepertoireLink(index, 'memo', event.target.value)} /></td>
                    <td><button className="btn btn-sm" type="button" disabled={isSaving} onClick={() => setRepertoireLinkInputs(current => current.filter(row => row.rowId !== repertoireLinkInput.rowId))}>削除</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button className="btn mb-4 btn-sm" type="button" disabled={isSaving} onClick={() => setRepertoireLinkInputs(current => [...current, newRepertoireLinkInput(Math.max(-1, ...current.map(row => row.rowId)) + 1)])}>行追加</button>
          
          {!isEmpty(saveError) && (
            <div className="mb-4 alert alert-error">{saveError}</div>
          )}
          
          <div className="modal-action justify-between">
            {repertoire != null && (
              <button className="btn btn-error" type="button" disabled={isSaving} onClick={onDelete}>削除する</button>
            )}
            <button className="btn" type="button" disabled={isSaving} onClick={onClose}>キャンセル</button>
            <button className="btn btn-primary" type="submit" disabled={isSaving}>{repertoire == null ? '登録する' : '更新する'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
