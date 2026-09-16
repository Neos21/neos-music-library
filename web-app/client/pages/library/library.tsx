import { useEffect, useState, type ReactElement } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { commentDisplayName } from '../../../shared/schemas/track-schema';
import { adminApi } from '../../helpers/admin-api';
import { convertToLf } from '../../helpers/convert-to-lf';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../stores/library-store';

import type { LibraryTrack } from '../../../shared/types/app/library-track';

/** ライブラリ一覧 */
export default function Library(): ReactElement {
  const isHydrated    = useLibraryStore(state => state.isHydrated);
  const libraryTracks = useLibraryStore(state => state.libraryTracks);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);  // 一覧読込中か否か
  const [listError, setListError] = useState<string>('');     // 一覧読込に失敗した場合のエラーメッセージ
  
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);  // 編集中のトラック ID
  const [editingComment, setEditingComment] = useState<string>('');           // 編集中のコメント
  const [isSaving      , setIsSaving      ] = useState<boolean>(false);       // 保存処理中か否か
  const [saveError     , setSaveError     ] = useState<string>('');           // 保存に失敗した場合のエラーメッセージ
  
  /** ライブラリ一覧を取得する */
  const onLoadLibraryTracks = async (): Promise<void> => {
    setListError('');
    setIsLoading(true);
    
    // ストアからのキャッシュが取得できていれば (0件でなければ) API 取得はしない
    if(useLibraryStore.getState().libraryTracks.length > 0) return setIsLoading(false);
    
    try {
      const response = await adminApi.get('/api/library').json<{ result: Array<LibraryTrack>; }>();
      // Zustand のインメモリキャッシュは同期的に行われ、裏で IndexedDB への保存も非同期で行われる (万が一 `indexedDBStorage` で例外が発生した場合は Uncaught エラーになる)
      useLibraryStore.getState().setLibraryTracks(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, 'ライブラリ一覧の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // IndexedDB からの復元が終わっていない間は何もしない
    if(!isHydrated) return;
    // キャッシュがあればそれを表示し、キャッシュがなければ (0件なら) API から取得する
    (async () => {
      await onLoadLibraryTracks();
    })();
  }, [isHydrated]);
  
  /** コメントの編集を開始する */
  const onStartEditComment = (libraryTrack: LibraryTrack): void => {
    if(editingTrackId != null) return;  // 編集中の楽曲があるようなら開始させない
    
    setEditingTrackId(libraryTrack.id);  // トラック ID を与えることで編集開始にする
    setEditingComment(convertToLf(libraryTrack.comment ?? ''));  // LF に変換する
    setSaveError('');
  };
  
  /** コメントを保存する */
  const onSaveComment = async (libraryTrack: LibraryTrack): Promise<void> => {
    if(isSaving) return;  // 保存中の場合は何もしない
    
    // 変更なしの場合は保存処理はせず編集を終了する
    const originalComment = convertToLf(libraryTrack.comment ?? '');
    if(editingComment === originalComment) {
      setEditingTrackId(null);
      setEditingComment('');
      setSaveError('');
      return;
    }
    
    setIsSaving(true);
    setSaveError('');
    try {
      const response = await adminApi.patch(`/api/tracks/${libraryTrack.id}`, {
        json: {
          comment: editingComment
        }
      })
      .json<{ result: Pick<LibraryTrack, 'id' | 'comment' | 'updated_at'>; }>();
      
      // 更新されたコメントをストアに反映する
      useLibraryStore.getState().updateLibraryTrackComment(response.result);
      // 編集を終了する
      setEditingTrackId(null);
      setEditingComment('');
    }
    catch(error) {
      setSaveError(extractApiErrorMessage(error, 'コメントの更新に失敗しました'));
    }
    finally {
      setIsSaving(false);
    }
  };
  
  return (
    <main className="px-2 py-4">
      {isLoading && (<div className="text-center"><span className="loading loading-spinner text-warning" /></div>)}
      {!isEmpty(listError) && (<div className="alert alert-soft alert-error">{listError}</div>)}
      {!isLoading && libraryTracks.length === 0 && (<p>登録されている楽曲はありません。</p>)}
      
      {!isLoading && libraryTracks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead className="[&>tr>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
              <tr>
                <th>アーティスト</th>
                <th>アルバム</th>
                <th>曲順</th>
                <th>曲名</th>
                <th>コメント</th>
                <th>レパートリー</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:align-top">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
              {libraryTracks.map(libraryTrack => (
                <tr key={libraryTrack.id}>
                  <td>{libraryTrack.artist}</td>
                  <td>{libraryTrack.album}</td>
                  <td className="text-right">{libraryTrack.track_number === 0 ? '' : libraryTrack.track_number}</td>
                  <td>{libraryTrack.title}</td>
                  <td className="whitespace-pre-wrap" onClick={() => onStartEditComment(libraryTrack)}>
                    {editingTrackId === libraryTrack.id ? (
                      <textarea autoFocus placeholder={commentDisplayName}
                        value={editingComment} disabled={isSaving}
                        onChange={event => setEditingComment(event.target.value)}
                        onBlur={() => onSaveComment(libraryTrack)}
                      />
                    ) : libraryTrack.comment}
                  </td>
                  <td>
                    {/* TODO : レパートリー1行の名前を表示 → モーダルで詳細表示 (編集 or 削除) */}
                    {/* TODO : レパートリー追加ボタン → モーダルで入力し新規追加 */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {!isEmpty(saveError) && (
        <div className="fixed top-2 right-2">
          <div className="alert alert-error">{saveError}</div>
        </div>
      )}
    </main>
  );
}
