import { useState, type ReactElement } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { matchesTrackSearch } from '../../../helpers/matches-track-search';
import { useTracksStore } from '../../../stores/tracks-store';

import type { TrackListItem } from '../../../../shared/types/track';

type Props = {
  onSelect: (track: TrackListItem) => void;
  onClose: () => void;
};

/** フォームの入力を保持したまま紐付ける楽曲を選ぶモーダル */
export const TrackSearchModal = ({ onSelect, onClose }: Props): ReactElement => {
  const tracks = useTracksStore(state => state.tracks);
  const isHydrated = useTracksStore(state => state.isHydrated);
  const [searchQuery, setSearchQuery] = useState<string>('');  // 検索入力値・空文字は全件表示
  
  const searchText = searchQuery.trim().toLowerCase();
  const filteredTracks = isEmpty(searchText) ? tracks : tracks.filter(track => matchesTrackSearch(track, searchText));
  
  return (
    <div className="modal modal-open z-1000">
      <div className="modal-box max-w-4xl p-4">
        <h2 className="mb-4 text-lg font-bold">楽曲を選択する</h2>
        <input className="input mb-4 w-full input-sm" type="search" placeholder="アーティスト・アルバム・曲名で検索" value={searchQuery} readOnly={!isHydrated} autoFocus onChange={event => setSearchQuery(event.target.value)} />
        {!isHydrated && (
          <p className="mb-4 text-sm">楽曲一覧を復元しています。</p>
        )}
        {isHydrated && (
          <div className="mb-4 overflow-x-auto">
            <table className="library-table">  {/* eslint-disable-line tailwindcss/no-custom-classname */}
              <thead>
                <tr>
                  <th>ID</th>
                  <th>アーティスト</th>
                  <th>アルバム</th>
                  <th>曲名</th>
                </tr>
              </thead>
              <tbody>
                {filteredTracks.length === 0 && (
                  <tr><td colSpan={4}>{tracks.length === 0 ? '選択できる楽曲はありません。' : '該当する楽曲はありません。'}</td></tr>
                )}
                {filteredTracks.map(track => (
                  <tr key={track.id} className="cursor-pointer hover:bg-zinc-100" onClick={() => onSelect(track)}>
                    <td className="text-right whitespace-nowrap">{track.id}</td>
                    <td>{track.artist}</td>
                    <td>{track.album}</td>
                    <td>{track.title}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="modal-action justify-start">
          <button className="btn" type="button" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  );
};
