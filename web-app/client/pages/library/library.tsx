import { useEffect, useState, type ReactElement } from 'react';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../stores/library-store';

import type { LibraryTrack } from '../../../shared/types/app/library-track';

/** ライブラリ一覧 */
export default function Library(): ReactElement {
  const isHydrated    = useLibraryStore(state => state.isHydrated);
  const libraryTracks = useLibraryStore(state => state.libraryTracks);
  
  const [isLoading   , setIsLoading   ] = useState<boolean>(true);  // 読込中か否か
  const [errorMessage, setErrorMessage] = useState<string>('');     // エラーメッセージ
  
  /** ライブラリ一覧を取得する */
  const onLoadLibraryTracks = async (): Promise<void> => {
    setErrorMessage('');
    setIsLoading(true);
    
    // ストアからのキャッシュが取得できていれば (0件でなければ) API 取得はしない
    if(useLibraryStore.getState().libraryTracks.length > 0) return setIsLoading(false);
    
    try {
      const response = await adminApi.get('/api/library').json<{ result: Array<LibraryTrack>; }>();
      // Zustand のインメモリキャッシュは同期的に行われ、裏で IndexedDB への保存も非同期で行われる (万が一 `indexedDBStorage` で例外が発生した場合は Uncaught エラーになる)
      useLibraryStore.getState().setLibraryTracks(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ライブラリ一覧の取得に失敗しました'));
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
  
  return (
    <main className="px-2 py-4">
      {isLoading && (<div className="text-center"><span className="loading loading-spinner text-warning" /></div>)}
      {!isEmpty(errorMessage) && (<div className="alert alert-soft alert-error">{errorMessage}</div>)}
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
                  <td>{libraryTrack.comment}</td>
                  <td>TODO</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
