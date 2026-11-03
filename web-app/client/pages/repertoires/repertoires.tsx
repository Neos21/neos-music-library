import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';

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
  
  const [isLoading       , setIsLoading       ] = useState<boolean>(true);                    // 一覧読込中か否か
  const [error           , setError           ] = useState<string>('');                       // エラーメッセージ
  const [activeRepertoire, setActiveRepertoire] = useState<RepertoireListItem | null>(null);  // 表示中のレパートリー・モーダルを閉じていれば `null`
  
  /** キャッシュを優先し、再読込時のみ取得し直す */
  const onLoadRepertoires = async (isForceReload = false): Promise<void> => {
    setError('');
    setIsLoading(true);
    
    if(isForceReload === false && useRepertoiresStore.getState().repertoires.length > 0) return setIsLoading(false);
    
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
    if(isHydrated !== true) return;
    (async () => {
      await onLoadRepertoires();
    })();
  }, [isHydrated]);
  
  return (
    <main className="px-2 py-4">
      <div className="mb-4 text-right">
        <Link className="btn btn-sm" to="/tracks">楽曲一覧</Link>
      </div>
      
      {isLoading && (
        <div className="text-center"><span className="loading loading-spinner text-warning" /></div>
      )}
      
      {!isEmpty(error) && (
        <div className="mb-4 alert alert-soft alert-error">{error}</div>
      )}
      
      {!isLoading && (
        <div className="mb-4">
          <button className="btn btn-info btn-sm" type="button" disabled={!isHydrated || isLoading} onClick={() => onLoadRepertoires(true)}>再読込</button>
        </div>
      )}
      
      {!isLoading && (
        <p className="mb-4 text-sm">{repertoires.length === 0 ? '登録されているレパートリーはありません。' : `レパートリー : ${repertoires.length} 件`}</p>
      )}
      {!isLoading && repertoires.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
            <colgroup>
              <col className="w-px" />
              <col className="w-[25%] min-w-[10em]" />
              <col className="w-[25%] min-w-[10em]" />
              <col className="w-[30%] min-w-[13em]" />
              <col className="w-px" />
              <col className="w-px" />
            </colgroup>
            <thead>
              <tr>
                <th>ID</th>
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
                  <td className="text-right whitespace-nowrap">{repertoire.track?.id ?? '-'}</td>
                  {(['artist', 'album', 'title'] as const).map(field => (
                    <td key={field}>
                      {repertoire.track != null ? (
                        <>
                          <div className="text-black">{repertoire.track[field]}</div>
                          <div className="text-[.85em] text-gray-500">{repertoire[field]}</div>
                        </>
                      ) : (
                        <div className="text-black">{repertoire[field]}</div>
                      )}
                    </td>
                  ))}
                  <td className="whitespace-nowrap">{repertoirePartNames[repertoire.part]}</td>
                  <td className="whitespace-nowrap">{repertoire.proficiency == null ? '-' : repertoireProficiencyNames[repertoire.proficiency]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
