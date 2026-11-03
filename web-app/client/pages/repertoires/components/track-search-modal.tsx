import { useState, type ReactElement } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { matchesTrackSearch } from '../../../helpers/matches-track-search';
import { useTracksStore } from '../../../stores/tracks-store';

import type { TrackListItem } from '../../../../shared/types/track';

type Props = {
  /** 楽曲を選択した時の処理 */
  onSelect: (track: TrackListItem) => void;
  /** モーダルを閉じる時の処理 */
  onClose: () => void;
};

/** 紐付ける楽曲を検索して選択するモーダル */
export const TrackSearchModal = ({ onSelect, onClose }: Props): ReactElement => {
  const isHydrated = useTracksStore(state => state.isHydrated);
  const tracks     = useTracksStore(state => state.tracks);
  
  const [searchQuery, setSearchQuery] = useState<string>('');  // 検索入力値・空文字は全件表示
  
  const searchText = searchQuery.trim().toLowerCase();
  const filteredTracks = isEmpty(searchText) ? tracks : tracks.filter(track => matchesTrackSearch(track, searchText));
  
  return (
    <div className="modal modal-open z-1000">
      <div className="modal-box max-w-4xl p-4">
        <div className="mb-4 grid grid-cols-[1fr_auto] gap-x-2">
          <h2 className="text-lg font-bold">楽曲を選択する</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>閉じる</button>
        </div>
        
        <input type="search" className="input mb-4 w-full input-sm" placeholder="アーティスト・アルバム・曲名で検索"
          value={searchQuery}
          readOnly={!isHydrated}
          onChange={event => setSearchQuery(event.target.value)}
          autoFocus />
        
        {isHydrated && (
          <div className="mb-4 overflow-x-auto">
            <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
              <colgroup>
                <col className="w-[33%] min-w-[10em]" />
                <col className="w-[34%] min-w-[10em]" />
                <col className="w-[33%] min-w-[10em]" />
              </colgroup>
              <thead>
                <tr>
                  <th>アーティスト</th>
                  <th>アルバム</th>
                  <th>曲名</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.length === 0 && (
                  <tr><td colSpan={3}>{tracks.length === 0 ? '選択できる楽曲はありません。' : '該当する楽曲はありません。'}</td></tr>
                )}
                {filteredTracks.map(track => (
                  <tr key={track.id} className="cursor-pointer hover:bg-zinc-100" onClick={() => onSelect(track)}>
                    <td>{track.artist}</td>
                    <td>{track.album}</td>
                    <td>{track.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
