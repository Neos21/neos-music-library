import type { TrackListItem } from '../../shared/types/track';

/** アーティスト名・アルバム名・曲名を大文字小文字を区別せず検索する */
export const matchesTrackSearch = (item: Pick<TrackListItem, 'artist' | 'album' | 'title'>, searchText: string): boolean => (item.artist ?? '').toLowerCase().includes(searchText) || (item.album ?? '').toLowerCase().includes(searchText) || item.title.toLowerCase().includes(searchText);
