import type { Repertoire } from '../../shared/types/repertoire';
import type { Track } from '../../shared/types/track';

/** レパートリーに紐付く楽曲情報を取得する際の行データ・紐付く楽曲がなければ `null` になる */
export type RepertoireRow = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  linked_track_id: Track['id'] | null;
  track_artist   : Track['artist'];
  track_album    : Track['album'];
  track_title    : Track['title'] | null;
};
