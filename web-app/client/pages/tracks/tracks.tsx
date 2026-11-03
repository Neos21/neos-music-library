import { useEffect, useState, type ReactElement } from 'react';

import { EditCommentModal } from './components/edit-comment-modal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useTracksStore } from '../../stores/tracks-store';

import type { TrackListItem } from '../../../shared/types/app/track-list-item';
import type { Result } from '../../../shared/types/utilities/result';

/** アーティスト名・アルバム名・曲名を大文字小文字を区別せず検索する */
const matchesSearch = (item: Pick<TrackListItem, 'artist' | 'album' | 'title'>, searchText: string): boolean => (item.artist ?? '').toLowerCase().includes(searchText) || (item.album ?? '').toLowerCase().includes(searchText) || item.title.toLowerCase().includes(searchText);

/** 楽曲一覧 */
export default function Tracks(): ReactElement {
  const isHydrated = useTracksStore(state => state.isHydrated);
  const tracks     = useTracksStore(state => state.tracks);
  
  const [isLoading  , setIsLoading  ] = useState<boolean>(true);            // 一覧読込中か否か
  const [listError  , setListError  ] = useState<string>('');               // 一覧読込に失敗した場合のエラーメッセージ
  const [searchQuery, setSearchQuery] = useState<string>('');               // 一覧の検索入力値・空文字は全件表示
  const [activeTrackId, setActiveTrackId] = useState<number | null>(null);  // コメント編集中の楽曲 ID・閉じていれば `null`
  
  // 検索文字列の処理とフィルタリングした一覧
  const searchText = searchQuery.trim().toLowerCase();
  const filteredTracks = isEmpty(searchText) ? tracks : tracks.filter(track => matchesSearch(track, searchText));
  
  // モーダルの管理
  const activeTrack = activeTrackId == null ? null : tracks.find(track => track.id === activeTrackId);
  
  /** 楽曲一覧を取得する */
  const onLoadTracks = async (isForceReload = false): Promise<void> => {
    setListError('');
    setIsLoading(true);
    
    const { tracks } = useTracksStore.getState();
    if(isForceReload === false && tracks.length > 0) return setIsLoading(false);
    
    try {
      const response = await adminApi.get('/api/tracks').json<Result<Array<TrackListItem>>>();
      if(response.error != null) return setListError(response.error);
      
      // Zustand のインメモリキャッシュは同期的に行われ、裏で IndexedDB への保存も非同期で行われる (万が一 `indexedDBStorage` で例外が発生した場合は Uncaught エラーになる)
      useTracksStore.getState().setTracks(response.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, '楽曲一覧の取得に失敗しました'));
    }
    finally {
      setIsLoading(false);
    }
  };
  
  // 画面初期表示時
  useEffect(() => {
    // IndexedDB からの復元が終わっていない間は何もしない
    if(isHydrated !== true) return;
    // キャッシュがあればそれを表示し、キャッシュがなければ (0件なら) API から取得する
    (async () => {
      await onLoadTracks(false);
    })();
  }, [isHydrated]);
  
  return (
    <main className="px-2 py-4">
      {isLoading && (<div className="text-center"><span className="loading loading-spinner text-warning" /></div>)}
      
      {!isEmpty(listError) && (
        <div className="mb-4 alert alert-soft alert-error">{listError}</div>
      )}
      
      {!isLoading && (
        <div className="mb-4 flex gap-2">
          <input className="input w-full input-sm" type="search" placeholder="検索" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} />
          <button className="btn btn-info btn-sm" type="button" disabled={!isHydrated || isLoading} onClick={() => onLoadTracks(true)}>再読込</button>
        </div>
      )}
      
      {!isLoading && tracks.length === 0 && (<p className="mb-6 text-sm">登録されている楽曲はありません。</p>)}
      {!isLoading && tracks.length > 0 && (
        <div className="mb-6 overflow-x-auto">
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
                  <td className="cursor-pointer whitespace-pre-wrap hover:bg-zinc-100" onClick={() => setActiveTrackId(track.id)}>{track.comment}</td>
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
          onClose={() => setActiveTrackId(null)}
        />
      )}
    </main>
  );
}
