import type { Repertoire } from '../../shared/types/repertoire';
import type { Track } from '../../shared/types/track';

/** LEFT JOIN で取得する楽曲項目は、紐付くレコードがない場合に `null` になる */
export type RepertoireRow = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  linked_track_id: Track['id'] | null;
  track_artist   : Track['artist'];
  track_album    : Track['album'];
  track_title    : Track['title'] | null;
};
