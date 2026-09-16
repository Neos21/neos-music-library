import { useEffect, useState, type ReactElement } from 'react';
import { useAdminStore } from '../../../stores/admin-store';
import type { LibraryTrack } from '../../../../shared/types/app/library-track';
import ky from 'ky';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { isEmpty } from '../../../../shared/helpers/is-empty';

/** ライブラリ一覧 */
export const Library = (): ReactElement => {
  const token = useAdminStore(state => state.token);
  
  const [isLoading    , setIsLoading    ] = useState<boolean>(true);            // 読込中か否か
  const [libraryTracks, setLibraryTracks] = useState<Array<LibraryTrack>>([]);  // ライブラリ一覧
  const [errorMessage , setErrorMessage ] = useState<string>('');               // 読込失敗時のエラーメッセージ
  
  /** ライブラリ一覧を取得する */
  const onLoadLibraryTracks = async (): Promise<void> => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await ky.get('/api/library').json<{ result: Array<LibraryTrack>; }>();
      setLibraryTracks(response.result);
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ライブラリ一覧の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    (async () => {
      await onLoadLibraryTracks();
    })();
  }, []);
  
  return (
    <>
      {isLoading && (<div className="text-center"><span className="loading loading-spinner text-warning" /></div>)}
      {!isEmpty(errorMessage) && (<div className="alert alert-soft alert-error">{errorMessage}</div>)}
      {!isLoading && libraryTracks.length === 0 && (<p>登録されている楽曲はありません。</p>)}
      
      {!isLoading && libraryTracks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-xs">
            <thead className="[&>tr>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
              <tr>
                <th>アーティスト名</th>
                <th>アルバム名</th>
                <th>曲順</th>
                <th>曲名</th>
                <th>コメント</th>
                <th>TODO : JSON</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:align-top">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
              {libraryTracks.map(libraryTrack => (
                <tr key={libraryTrack.id}>
                  <td>{libraryTrack.artist}</td>
                  <td>{libraryTrack.album}</td>
                  <td>{libraryTrack.track_number}</td>
                  <td>{libraryTrack.title}</td>
                  <td>{libraryTrack.comment}</td>
                  <td>{JSON.stringify(libraryTrack)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
