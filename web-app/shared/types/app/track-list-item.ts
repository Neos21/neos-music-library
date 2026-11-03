import type { Track } from '../../schemas/track-schema';

/** 楽曲一覧で使用する公開項目 */
export type TrackListItem = Pick<Track, 'id' | 'artist' | 'album' | 'track_number' | 'title' | 'comment'>;
