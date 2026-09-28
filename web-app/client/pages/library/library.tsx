import { useEffect, useState, type ReactElement } from 'react';

import { EditCommentModal } from './components/edit-comment-modal';
import { RepertoireModal } from './components/repertoire-modal';
import { repertoirePartNames, repertoireProficiencyNames } from '../../../shared/constants/repertoire-constants';
import { repertoireLinkTypeNames } from '../../../shared/constants/repertoire-link-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useLibraryStore } from '../../stores/library-store';

import type { LibraryTrack, RepertoireWithoutTrack } from '../../../shared/types/app/library-track';

type ActiveModal =
  | { type: 'comment' | 'repertoire-create'; trackId: number; }
  | { type: 'repertoire-edit'; trackId: number; repertoireId: number; }
  | { type: 'repertoire-create-standalone'; }
  | null;

/** ライブラリ一覧 */
export default function Library(): ReactElement {
  const isHydrated    = useLibraryStore(state => state.isHydrated);
  const libraryTracks = useLibraryStore(state => state.libraryTracks);
  const repertoiresWithoutTrack = useLibraryStore(state => state.repertoiresWithoutTrack);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);  // 一覧読込中か否か
  const [listError, setListError] = useState<string>('');     // 一覧読込に失敗した場合のエラーメッセージ
  
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);  // 表示中のモーダル・トラック単位の場合は ID を保持し、閉じていれば `null`
  const activeTrack = activeModal == null || !('trackId' in activeModal) ? null : libraryTracks.find(libraryTrack => libraryTrack.id === activeModal.trackId);
  const activeRepertoire = activeModal?.type === 'repertoire-edit'
    ? activeTrack?.repertoires.find(repertoire => repertoire.id === activeModal.repertoireId)
    : null;
  
  /** ライブラリ一覧を取得する */
  const onLoadLibraryTracks = async (isForceReload = false): Promise<void> => {
    setListError('');
    setIsLoading(true);
    
    const { libraryTracks, repertoiresWithoutTrack } = useLibraryStore.getState();
    const shouldLoadLibraryTracks = isForceReload || libraryTracks.length === 0;
    const shouldLoadRepertoiresWithoutTrack = isForceReload || repertoiresWithoutTrack.length === 0;
    if(!shouldLoadLibraryTracks && !shouldLoadRepertoiresWithoutTrack) return setIsLoading(false);
    
    const errors: Array<string> = [];
    await Promise.all([
      (async () => {
        if(!shouldLoadLibraryTracks) return;
        try {
          const response = await adminApi.get('/api/library').json<{ result: Array<LibraryTrack>; }>();
          // Zustand のインメモリキャッシュは同期的に行われ、裏で IndexedDB への保存も非同期で行われる (万が一 `indexedDBStorage` で例外が発生した場合は Uncaught エラーになる)
          useLibraryStore.getState().setLibraryTracks(response.result);
        }
        catch(error) {
          errors.push(extractApiErrorMessage(error, 'ライブラリ一覧の取得に失敗しました'));
        }
      })(),
      (async () => {
        if(!shouldLoadRepertoiresWithoutTrack) return;
        try {
          const response = await adminApi.get('/api/repertoires', { searchParams: { filter: 'no-track' } }).json<{ result: Array<RepertoireWithoutTrack>; }>();
          useLibraryStore.getState().setRepertoiresWithoutTrack(response.result);
        }
        catch(error) {
          errors.push(extractApiErrorMessage(error, 'レパートリー一覧の取得に失敗しました'));
        }
      })()
    ]);
    setListError(errors.join('・'));
    setIsLoading(false);
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
      
      <div className="mb-4 flex gap-2">
        <button className="btn btn-primary" type="button" disabled={!isHydrated || isLoading} onClick={() => onLoadLibraryTracks(true)}>再読込</button>
        <button className="btn" type="button" onClick={() => setActiveModal({ type: 'repertoire-create-standalone' })}>レパートリー追加</button>
      </div>
      
      {!isLoading && libraryTracks.length === 0 && (<p className="mb-4">登録されている楽曲はありません。</p>)}
      {!isLoading && libraryTracks.length > 0 && (
        <div className="mb-4 overflow-x-auto">
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
      
      <h2 className="mb-2 text-lg font-bold">レパートリー</h2>
      {!isLoading && repertoiresWithoutTrack.length === 0 && (<p>トラックに紐付かないレパートリーはありません。</p>)}
      {!isLoading && repertoiresWithoutTrack.length > 0 && (
        <div className="overflow-x-auto">
          <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
            <thead>
              <tr>
                <th>アーティスト</th>
                <th>アルバム</th>
                <th>曲名</th>
                <th>パート</th>
                <th>習熟度</th>
                <th>メモ</th>
                <th>リンク</th>
              </tr>
            </thead>
            <tbody>
              {repertoiresWithoutTrack.map(repertoire => (
                <tr key={repertoire.id}>
                  <td>{repertoire.artist}</td>
                  <td>{repertoire.album}</td>
                  <td>{repertoire.title}</td>
                  <td>{repertoirePartNames[repertoire.part]}</td>
                  <td>{repertoire.proficiency == null ? '' : repertoireProficiencyNames[repertoire.proficiency]}</td>
                  <td className="whitespace-pre-wrap">{repertoire.memo}</td>
                  <td>
                    {repertoire.repertoire_links.map(link => (
                      <div key={link.id}>
                        {repertoireLinkTypeNames[link.type]}: <a className="link" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
                      </div>
                    ))}
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
      {activeModal?.type === 'repertoire-create-standalone' && (
        <RepertoireModal
          libraryTrack={null}
          onClose={() => setActiveModal(null)}
          onSaved={() => onLoadLibraryTracks(true)}
        />
      )}
    </main>
  );
}
