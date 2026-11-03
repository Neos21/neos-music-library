import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useRepertoiresStore } from '../../stores/repertoires-store';

import type { RepertoireListItem } from '../../../shared/types/repertoire';
import type { Result } from '../../../shared/types/utilities/result';

/** レパートリー一覧 */
export default function Repertoires(): ReactElement {
  const isHydrated = useRepertoiresStore(state => state.isHydrated);
  const repertoires = useRepertoiresStore(state => state.repertoires);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);  // 一覧読込中か否か
  const [error    , setError    ] = useState<string>('');     // エラーメッセージ
  
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
    </main>
  );
}
