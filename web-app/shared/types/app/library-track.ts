import type { Repertoire } from '../../schemas/repertoire-schema';

/** 楽曲に紐付かないレパートリー1件を表す型 */
export type RepertoireWithoutTrack = Omit<Repertoire, 'created_at' | 'updated_at'> & { track_id: null; };
