
import type { Track } from './track';
import type { createRepertoireSchema, newRepertoireSchema, repertoireSchema, updateRepertoireSchema } from '../schemas/repertoire-schema';
import type z from 'zod';

/** `repertoires` テーブルの型 : 新規登録用 */
export type NewRepertoire    = z.infer<typeof newRepertoireSchema>;
/** レパートリーの登録入力 */
export type CreateRepertoire = z.infer<typeof createRepertoireSchema>;
/** レパートリーの更新入力 */
export type UpdateRepertoire = z.infer<typeof updateRepertoireSchema>;
/** `repertoires` テーブルの型 : 新規登録後 */
export type Repertoire       = z.infer<typeof repertoireSchema>;

/** レパートリーと、存在する場合のみ紐付く楽曲情報 */
export type RepertoireListItem = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  track: Pick<Track, 'id' | 'artist' | 'album' | 'title'> | null;
};
