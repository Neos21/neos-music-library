import type { RepertoireLink } from '../../schemas/repertoire-link-schema';
import type { Repertoire } from '../../schemas/repertoire-schema';
import type { Track } from '../../schemas/track-schema';

/** レパートリー1件を表す型 */
export type LibraryRepertoire = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  repertoire_links: Array<Omit<RepertoireLink, 'repertoire_id' | 'created_at' | 'updated_at'>>;
};

/** 楽曲に紐付かないレパートリー1件を表す型 */
export type RepertoireWithoutTrack = LibraryRepertoire & { track_id: null; };

/** ライブラリ1件を表す型 */
export type LibraryTrack = Omit<Track, 'imported_comment' | 'persistent_id_high' | 'persistent_id_low' | 'created_at' | 'updated_at'> & {
  repertoires: Array<LibraryRepertoire>;
};
