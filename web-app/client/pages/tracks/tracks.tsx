import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router';

import { EditCommentModal } from './components/edit-comment-modal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { matchesTrackSearch } from '../../helpers/matches-track-search';
import { useTracksStore } from '../../stores/tracks-store';

import type { TrackListItem } from '../../../shared/types/track';
import type { Result } from '../../../shared/types/utilities/result';

/** 楽曲一覧 */
export default function Tracks(): ReactElement {
  const isHydrated = useTracksStore(state => state.isHydrated);
  const tracks     = useTracksStore(state => state.tracks);
  
  const [isLoading  , setIsLoading  ] = useState<boolean>(true);               // 読込中か否か
  const [error      , setError      ] = useState<string>('');                  // エラーメッセージ
  const [searchQuery, setSearchQuery] = useState<string>('');                  // 検索入力値・空文字は全件表示
  const [activeTrack, setActiveTrack] = useState<TrackListItem | null>(null);  // コメント編集中の楽曲・モーダルを閉じていれば `null`
  
  /** 検索文字列を小文字に統一する */
  const searchText = searchQuery.trim().toLowerCase();
  /** フィルタリングした楽曲一覧 */
  const filteredTracks = isEmpty(searchText) ? tracks : tracks.filter(track => matchesTrackSearch(track, searchText));
  
  /** 楽曲一覧を取得する */
  const onLoadTracks = async (isForceReload = false): Promise<void> => {
    setError('');
    setIsLoading(true);
    
    if(!isForceReload && useTracksStore.getState().tracks.length > 0) return setIsLoading(false);
    
    try {
      const result = await adminApi.get('/api/tracks').json<Result<Array<TrackListItem>>>();
      if(result.error != null) return setError(result.error);
      
      // Zustand のインメモリキャッシュは同期的に行われ、裏で IndexedDB への保存も非同期で行われる (万が一 `indexedDBStorage` で例外が発生した場合は Uncaught エラーになる)
      useTracksStore.getState().setTracks(result.result);
    }
    catch(error) {
      setError(extractApiErrorMessage(error, '楽曲一覧の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  // 画面初期表示時
  useEffect(() => {
    // IndexedDB からの復元が終わっていない間は何もしない
    if(!isHydrated) return;
    // キャッシュがあればそれを表示し、キャッシュがなければ (0件なら) API から取得する
    (async () => {
      await onLoadTracks(false);
    })();
  }, [isHydrated]);
  
  return (
    <main className="px-2 py-4">
      <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-2 whitespace-nowrap">
        <h1 className="font-bold">楽曲一覧</h1>
        <Link to="/repertoires" className="btn btn-sm">レパートリー一覧</Link>
      </div>
      
      {isLoading && (
        <div className="text-center"><span className="loading loading-spinner text-warning" /></div>
      )}
      
      {!isEmpty(error) && (
        <div className="mb-4 alert alert-soft alert-error">{error}</div>
      )}
      
      {!isLoading && (
        <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-2">
          <input type="search" className="input w-full input-sm" placeholder="検索" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
          <button type="button" className="btn btn-info btn-sm" disabled={!isHydrated || isLoading} onClick={() => onLoadTracks(true)}>再読込</button>
        </div>
      )}
      
      {!isLoading && tracks.length === 0 && (
        <p className="mb-4 text-sm">登録されている楽曲はありません。</p>
      )}
      {!isLoading && tracks.length > 0 && (
        <div className="mb-4 overflow-x-auto">
          <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
            <colgroup>
              <col className="w-[20%] min-w-[10em]" />
              <col className="w-[20%] min-w-[10em]" />
              <col className="w-px" />
              <col className="w-[20%] min-w-[13em]" />
              <col className="w-[25%] min-w-[13em]" />
            </colgroup>
            <thead>
              <tr>
                <th>アーティスト</th>
                <th>アルバム</th>
                <th>曲順</th>
                <th>曲名</th>
                <th>コメント</th>
              </tr>
            </thead>
            <tbody>
              {!isEmpty(searchText) && filteredTracks.length === 0 && (
                <tr><td colSpan={5}>該当する楽曲はありません。</td></tr>
              )}
              {filteredTracks.map(track => (
                <tr key={track.id}>
                  <td>{track.artist}</td>
                  <td>{track.album}</td>
                  <td className="text-right whitespace-nowrap">{track.track_number === 0 ? '-' : track.track_number}</td>
                  <td>{track.title}</td>
                  <td className="cursor-pointer whitespace-pre-wrap hover:bg-zinc-100" onClick={() => setActiveTrack(track)}>{track.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {activeTrack != null && (
        <EditCommentModal
          key={activeTrack.id}
          track={activeTrack}
          onClose={() => setActiveTrack(null)}
        />
      )}
    </main>
  );
}
