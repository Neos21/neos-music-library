import type { RepertoireLink } from '../../schemas/repertoire-link-schema';
import type { Repertoire } from '../../schemas/repertoire-schema';

/** レパートリー1件を表す型 */
export type LibraryRepertoire = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  repertoire_links: Array<Omit<RepertoireLink, 'repertoire_id' | 'created_at' | 'updated_at'>>;
};

/** 楽曲に紐付かないレパートリー1件を表す型 */
export type RepertoireWithoutTrack = LibraryRepertoire & { track_id: null; };
