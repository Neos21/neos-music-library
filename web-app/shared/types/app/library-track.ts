import type { RepertoireLink } from '../../schemas/repertoire-link-schema';
import type { Repertoire } from '../../schemas/repertoire-schema';
import type { Track } from '../../schemas/track-schema';

/** レパートリー1件を表す型 */
export type LibraryRepertoire = Repertoire & {
  repertoire_links: Array<Omit<RepertoireLink, 'repertoire_id'>>;
};

/** トラックに紐付かないレパートリー1件を表す型 */
export type RepertoireWithoutTrack = LibraryRepertoire & { track_id: null; };

/** ライブラリ1件を表す型 */
export type LibraryTrack = Omit<Track, 'persistent_id_high' | 'persistent_id_low'> & {
  repertoires: Array<LibraryRepertoire>;
};
