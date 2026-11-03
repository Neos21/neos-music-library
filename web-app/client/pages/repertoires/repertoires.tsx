import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';

import { RepertoireFormModal } from './components/repertoire-form-modal';
import { RepertoireModal } from './components/repertoire-modal';
import { repertoirePartNames, repertoireProficiencyNames } from '../../../shared/constants/repertoire-constants';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useRepertoiresStore } from '../../stores/repertoires-store';

import type { RepertoireListItem } from '../../../shared/types/repertoire';
import type { Result } from '../../../shared/types/utilities/result';

/** レパートリー一覧 */
export default function Repertoires(): ReactElement {
  const isHydrated  = useRepertoiresStore(state => state.isHydrated);
  const repertoires = useRepertoiresStore(state => state.repertoires);
  
  const [isLoading       , setIsLoading       ] = useState<boolean>(true);                    // 読込中か否か
  const [error           , setError           ] = useState<string>('');                       // エラーメッセージ
  const [isCreating      , setIsCreating      ] = useState<boolean>(false);                   // 新規登録モーダルを表示中か否か
  const [activeRepertoire, setActiveRepertoire] = useState<RepertoireListItem | null>(null);  // 表示中のレパートリー・モーダルを閉じていれば `null`
  
  /** レパートリー一覧を取得する */
  const onLoadRepertoires = async (isForceReload = false): Promise<void> => {
    setError('');
    setIsLoading(true);
    
    if(!isForceReload && useRepertoiresStore.getState().repertoires.length > 0) return setIsLoading(false);
    
    try {
      const result = await adminApi.get('/api/repertoires').json<Result<Array<RepertoireListItem>>>();
      if(result.error != null) return setError(result.error);
      
      useRepertoiresStore.getState().setRepertoires(result.result);
    }
    catch(error) {
      setError(extractApiErrorMessage(error, 'レパートリー一覧の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if(!isHydrated) return;
    (async () => {
      await onLoadRepertoires();
    })();
  }, [isHydrated]);
  
  return (
    <main className="px-2 py-4">
      <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-2 whitespace-nowrap">
        <h1 className="font-bold">レパートリー一覧</h1>
        <Link className="btn btn-sm" to="/tracks">楽曲一覧</Link>
      </div>
      
      {isLoading && (
        <div className="text-center"><span className="loading loading-spinner text-warning" /></div>
      )}
      
      {!isEmpty(error) && (
        <div className="mb-4 alert alert-soft alert-error">{error}</div>
      )}
      
      {!isLoading && (
        <div className="mb-4 flex justify-between gap-2">
          <button type="button" className="btn btn-sm btn-success" onClick={() => setIsCreating(true)}>レパートリー追加</button>
          <button type="button" className="btn btn-info btn-sm" disabled={!isHydrated || isLoading} onClick={() => onLoadRepertoires(true)}>再読込</button>
        </div>
      )}
      
      {!isLoading && repertoires.length === 0 && (
        <p className="mb-4 text-sm">登録されているレパートリーはありません。</p>
      )}
      {!isLoading && repertoires.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
            <colgroup>
              <col className="w-[25%] min-w-[10em]" />
              <col className="w-[25%] min-w-[10em]" />
              <col className="w-[30%] min-w-[13em]" />
              <col className="w-px" />
              <col className="w-px" />
            </colgroup>
            <thead>
              <tr>
                <th>アーティスト</th>
                <th>アルバム</th>
                <th>曲名</th>
                <th>パート</th>
                <th>習熟度</th>
              </tr>
            </thead>
            <tbody>
              {repertoires.map(repertoire => (
                <tr key={repertoire.id} className="cursor-pointer hover:bg-zinc-100" onClick={() => setActiveRepertoire(repertoire)}>
                  <td>{repertoire.track != null ? repertoire.track.artist : repertoire.artist}</td>
                  <td>{repertoire.track != null ? repertoire.track.album  : repertoire.album}</td>
                  <td>{repertoire.track != null ? repertoire.track.title  : repertoire.title}</td>
                  <td className="whitespace-nowrap">{repertoirePartNames[repertoire.part]}</td>
                  <td className="whitespace-nowrap">{repertoire.proficiency == null ? '-' : repertoireProficiencyNames[repertoire.proficiency]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {isCreating && (
        <RepertoireFormModal
          repertoire={null}
          onClose={() => setIsCreating(false)}
        />
      )}
      
      {activeRepertoire != null && (
        <RepertoireModal
          key={activeRepertoire.id}
          repertoire={activeRepertoire}
          onClose={() => setActiveRepertoire(null)}
        />
      )}
    </main>
  );
}
