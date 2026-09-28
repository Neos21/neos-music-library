import { useState, type ReactElement, type SubmitEvent } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { createRepertoireSchema } from '../../../../shared/schemas/repertoire-schema';
import { adminApi } from '../../../helpers/admin-api';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';

import type { LibraryTrack } from '../../../../shared/types/app/library-track';

type Props = {
  libraryTrack: LibraryTrack | null;
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

/** トラックの値を初期値にした入力欄を作る・紐付かない場合は空欄にする */
const newRepertoireInput = (source: Pick<LibraryTrack, 'artist' | 'album' | 'title'> | null): RepertoireInput => ({
  artist     : source?.artist ?? '',
  album      : source?.album ?? '',
  title      : source?.title ?? '',
  part       : '',
  proficiency: '',
  memo       : ''
});

/** レパートリーの登録モーダル */
export const RepertoireModal = ({ libraryTrack, onClose, onSaved }: Props): ReactElement => {
  const [repertoireInput     , setRepertoireInput     ] = useState<RepertoireInput>(() => newRepertoireInput(libraryTrack));  // レパートリーの入力値・未選択の項目は空文字
  const [repertoireLinkInputs, setRepertoireLinkInputs] = useState<Array<RepertoireLinkInput>>(() => [newRepertoireLinkInput(0), newRepertoireLinkInput(1), newRepertoireLinkInput(2)]);  // レパートリーリンク入力行
  const [isSaving            , setIsSaving            ] = useState<boolean>(false);  // 登録処理中か否か
  const [saveError           , setSaveError           ] = useState<string>('');      // 登録に失敗した場合のエラーメッセージ
  
  /** レパートリー入力欄の項目を更新する */
  const onChangeRepertoire = (field: keyof RepertoireInput, value: string): void => {
    setRepertoireInput(current => ({ ...current, [field]: value }));
  };
  
  /** 指定したリンク入力行の項目を更新する */
  const onChangeRepertoireLink = (index: number, field: Exclude<keyof RepertoireLinkInput, 'rowId'>, value: string): void => {
    setRepertoireLinkInputs(current => current.map((linkInput, currentIndex) => currentIndex === index ? { ...linkInput, [field]: value } : linkInput));
  };
  
  /** レパートリーを登録する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if(isSaving) return;
    
    const parsed = createRepertoireSchema.safeParse({
      track_id: libraryTrack?.id ?? null,
      ...repertoireInput,
      repertoire_links: repertoireLinkInputs
    });
    if(!parsed.success) return setSaveError(mergeIssues(parsed.error));
    
    setIsSaving(true);
    setSaveError('');
    try {
      await adminApi.post('/api/repertoires', { json: parsed.data }).json<{ result: { id: number; }; }>();
      onClose();
      onSaved();
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, 'レパートリーの登録に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-4xl">
        <h2 className="mb-4 text-lg font-bold">レパートリーを登録する</h2>
        
        <form onSubmit={onSubmit}>
          {libraryTrack != null && (
            <>
              <h3 className="mb-2 font-bold">紐付くトラック</h3>
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
                <option value="guitar">ギター</option>
                <option value="bass">ベース</option>
                <option value="vocal">歌 (カラオケ)</option>
                <option value="keyboard">キーボード</option>
                <option value="other">その他</option>
              </select>
            </label>
            
            <label className="flex flex-col gap-1">習熟度
              <select className="select w-full" value={repertoireInput.proficiency} disabled={isSaving} onChange={event => onChangeRepertoire('proficiency', event.target.value)}>
                <option value="">未選択</option>
                <option value="planned">練習したい</option>
                <option value="practicing">練習中</option>
                <option value="playable">多少できる</option>
                <option value="mastered">マスター</option>
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
                {repertoireLinkInputs.map((linkInput, index) => (
                  <tr key={linkInput.rowId}>
                    <td>
                      <select className="select min-w-32 select-sm" value={linkInput.type} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'type', event.target.value)}>
                        <option value="">未選択</option>
                        <option value="tab">タブ譜</option>
                        <option value="lesson">教則</option>
                        <option value="reference">ライブ</option>
                        <option value="my_video">自分</option>
                        <option value="other">その他</option>
                      </select>
                    </td>
                    <td><input className="input min-w-48 input-sm" value={linkInput.url} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'url', event.target.value)} /></td>
                    <td><input className="input min-w-40 input-sm" value={linkInput.title} disabled={isSaving} onChange={event => onChangeRepertoireLink(index, 'title', event.target.value)} /></td>
                    <td><textarea className="textarea min-w-40 textarea-sm" value={linkInput.memo} disabled={isSaving} rows={2} onChange={event => onChangeRepertoireLink(index, 'memo', event.target.value)} /></td>
                    <td><button className="btn btn-sm" type="button" disabled={isSaving} onClick={() => setRepertoireLinkInputs(current => current.filter(row => row.rowId !== linkInput.rowId))}>削除</button></td>
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
            <button className="btn" type="button" disabled={isSaving} onClick={onClose}>キャンセル</button>
            <button className="btn btn-primary" type="submit" disabled={isSaving}>登録する</button>
          </div>
        </form>
      </div>
    </div>
  );
};
