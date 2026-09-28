import { useEffect, useState, type ReactElement } from 'react';

import { EditCommentModal } from './components/edit-comment-modal';
import { RepertoireModal } from './components/repertoire-modal';
import { repertoirePartNames } from '../../../shared/constants/repertoire-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../stores/library-store';

import type { LibraryTrack } from '../../../shared/types/app/library-track';

type ActiveModal = { type: 'comment' | 'repertoire-create'; trackId: number; } | { type: 'repertoire-edit'; trackId: number; repertoireId: number; } | null;

/** ライブラリ一覧 */
export default function Library(): ReactElement {
  const isHydrated    = useLibraryStore(state => state.isHydrated);
  const libraryTracks = useLibraryStore(state => state.libraryTracks);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);  // 一覧読込中か否か
  const [listError, setListError] = useState<string>('');     // 一覧読込に失敗した場合のエラーメッセージ
  
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);  // 表示中のモーダルと対象トラック ID・閉じていれば `null`
  const activeTrack = activeModal == null ? null : libraryTracks.find(libraryTrack => libraryTrack.id === activeModal.trackId);
  const activeRepertoire = activeModal?.type === 'repertoire-edit'
    ? activeTrack?.repertoires.find(repertoire => repertoire.id === activeModal.repertoireId)
    : null;
  
  /** ライブラリ一覧を取得する */
  const onLoadLibraryTracks = async (isForceReload = false): Promise<void> => {
    setListError('');
    setIsLoading(true);
    
    // ストアからのキャッシュが取得できていれば (0件でなければ) API 取得はしない
    if(!isForceReload && useLibraryStore.getState().libraryTracks.length > 0) return setIsLoading(false);
    
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
      await onLoadLibraryTracks(false);
    })();
  }, [isHydrated]);
  
  return (
    <main className="px-2 py-4">
      {isLoading && (<div className="text-center"><span className="loading loading-spinner text-warning" /></div>)}
      {!isEmpty(listError) && (<div className="alert alert-soft alert-error">{listError}</div>)}
      
      <button className="btn mb-4 btn-primary" type="button" disabled={!isHydrated || isLoading} onClick={() => onLoadLibraryTracks(true)}>再読込</button>
      
      {!isLoading && libraryTracks.length === 0 && (<p>登録されている楽曲はありません。</p>)}
      
      {!isLoading && libraryTracks.length > 0 && (
        <div className="overflow-x-auto">
          <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
            <colgroup>
              <col className="w-[20%] min-w-[10em]" />
              <col className="w-[20%] min-w-[10em]" />
              <col className="w-px" />
              <col className="w-[20%] min-w-[13em]" />
              <col className="w-[25%] min-w-[13em]" />
              <col className="w-px" />
            </colgroup>
            <thead>
              <tr>
                <th>アーティスト</th>
                <th>アルバム</th>
                <th>曲順</th>
                <th>曲名</th>
                <th>コメント</th>
                <th>レパートリー</th>
              </tr>
            </thead>
            <tbody>
              {libraryTracks.map(libraryTrack => (
                <tr key={libraryTrack.id}>
                  <td>{libraryTrack.artist}</td>
                  <td>{libraryTrack.album}</td>
                  <td className="text-right">{libraryTrack.track_number === 0 ? '' : libraryTrack.track_number}</td>
                  <td>{libraryTrack.title}</td>
                  <td className="whitespace-pre-wrap" onClick={() => setActiveModal({ type: 'comment', trackId: libraryTrack.id })}>{libraryTrack.comment}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {libraryTrack.repertoires.map(repertoire => (
                        <button
                          key={repertoire.id}
                          className="btn btn-ghost btn-xs"
                          type="button"
                          onClick={() => setActiveModal({ type: 'repertoire-edit', trackId: libraryTrack.id, repertoireId: repertoire.id })}
                        >{repertoirePartNames[repertoire.part]}</button>
                      ))}
                      <button className="btn btn-sm" type="button" onClick={() => setActiveModal({ type: 'repertoire-create', trackId: libraryTrack.id })}>レパートリー追加</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* コメント編集モーダル */}
      {activeModal?.type === 'comment' && activeTrack != null && (
        <EditCommentModal
          key={activeTrack.id}
          libraryTrack={activeTrack}
          onClose={() => setActiveModal(null)}
          onUpdated={() => onLoadLibraryTracks(true)}
        />
      )}
      {activeModal?.type === 'repertoire-create' && activeTrack != null && (
        <RepertoireModal
          key={activeTrack.id}
          libraryTrack={activeTrack}
          onClose={() => setActiveModal(null)}
          onSaved={() => onLoadLibraryTracks(true)}
        />
      )}
      {activeModal?.type === 'repertoire-edit' && activeTrack != null && activeRepertoire != null && (
        <RepertoireModal
          key={activeRepertoire.id}
          libraryTrack={activeTrack}
          repertoire={activeRepertoire}
          onClose={() => setActiveModal(null)}
          onSaved={() => onLoadLibraryTracks(true)}
        />
      )}
    </main>
  );
}
