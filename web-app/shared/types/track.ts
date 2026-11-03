import type { trackSchema } from '../schemas/track-schema';
import type z from 'zod';

/** `tracks` テーブルの型 */
export type Track = z.infer<typeof trackSchema>;

/** 楽曲一覧で使用する公開項目 */
export type TrackListItem = Pick<Track, 'id' | 'artist' | 'album' | 'track_number' | 'title' | 'comment'>;
