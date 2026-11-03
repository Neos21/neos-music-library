
import type { Track } from './track';
import type { editRepertoireSchema, repertoireSchema } from '../schemas/repertoire-schema';
import type z from 'zod';

/** `repertoires` テーブルの型 : 新規登録・編集用 */
export type EditRepertoire = z.infer<typeof editRepertoireSchema>;
/** `repertoires` テーブルの型 : 登録後の全カラム */
export type Repertoire     = z.infer<typeof repertoireSchema>;

/** レパートリーと、存在する場合のみ紐付く楽曲情報 */
export type RepertoireListItem = Omit<Repertoire, 'created_at' | 'updated_at'> & {
  track: Pick<Track, 'id' | 'artist' | 'album' | 'title'> | null;
};
