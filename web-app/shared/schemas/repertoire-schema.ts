import z from 'zod';

import { preprocessMultiLinesString, preprocessNullableNumber, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { isEmpty } from '../helpers/is-empty';

export const repertoireIdDisplayName = 'レパートリー ID' as const;
export const trackIdDisplayName      = 'トラック ID'     as const;
export const artistDisplayName       = 'アーティスト名'  as const;
export const albumDisplayName        = 'アルバム名'      as const;
export const titleDisplayName        = '曲名'            as const;
export const partDisplayName         = 'パート'          as const;
export const memoDisplayName         = 'メモ'            as const;

/** `repertoires` テーブルのスキーマ : 新規登録用 */
export const newRepertoireSchema = z.object({
  /** トラック ID (`tracks.id` を紐付ける・`null` 許容) */
  track_id    : z.preprocess(
                  preprocessNullableNumber,
                  z.number({ error: zodErrorMessages.invalidType(trackIdDisplayName) })
                    .nullable()
                ),
  /** アーティスト名 */
  artist      : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(artistDisplayName) })
                    .min(1, { error: zodErrorMessages.empty(artistDisplayName) })
                ),
  /** アルバム名 */
  album       : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(albumDisplayName) })
                    .min(1, { error: zodErrorMessages.empty(albumDisplayName) })
                ),
  /** 曲名 */
  title       : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(titleDisplayName) })
                    .min(1, { error: zodErrorMessages.empty(titleDisplayName) })
                ),
  /** パート */
  part        : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(titleDisplayName) })
                    .min(1, { error: zodErrorMessages.empty(titleDisplayName) })
                ),
  /** 習熟度 (`null` 許容) */
  proficiency : z.preprocess(
                  preprocessOneLineString,
                  z.string({ error: zodErrorMessages.invalidType(titleDisplayName) })
                    .nullable()
                ),
  /** メモ (複数行・`null` 許容) */
  memo        : z.preprocess(
                  preprocessMultiLinesString,
                  z.string({ error: zodErrorMessages.invalidType(memoDisplayName) })
                    .nullable()
                )
});

/** `repertoires` テーブルのスキーマ : 新規登録後 */
export const repertoireSchema = newRepertoireSchema.extend({
  /** レパートリー ID */
  id        : z.preprocess(
                value => isEmpty(value) ? 0 : value,  // `null`・`undefined` は 0 扱いにしてエラーにする
                z.coerce.number({ error: zodErrorMessages.invalidType(repertoireIdDisplayName) })
                  .int({ error: zodErrorMessages.integer(repertoireIdDisplayName) })
                  .min(1, { error: zodErrorMessages.minimumNumber(repertoireIdDisplayName, 1) })
              ),
  /** 初回作成日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  created_at: z.string().nullish(),
  /** 最終更新日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  updated_at: z.string().nullish()
});

/** `repertoires` テーブルの型 : 新規登録用 */
export type NewRepertoire = z.infer<typeof newRepertoireSchema>;
/** `repertoires` テーブルの型 : 新規登録後 */
export type Repertoire    = z.infer<typeof repertoireSchema>;
