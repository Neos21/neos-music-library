import z from 'zod';

import { newRepertoireLinkSchema } from './repertoire-link-schema';
import { preprocessMultiLinesString, preprocessNullableNumber, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { repertoirePartValues, repertoireProficiencyValues } from '../constants/repertoire-constants';
import { isEmpty } from '../helpers/is-empty';

const repertoireIdDisplayName = 'レパートリー ID' as const;
const trackIdDisplayName      = 'トラック ID'     as const;
const artistDisplayName       = 'アーティスト名'  as const;
const albumDisplayName        = 'アルバム名'      as const;
const titleDisplayName        = '曲名'            as const;
const partDisplayName         = 'パート'          as const;
const memoDisplayName         = 'メモ'            as const;

/** `repertoires` テーブルのスキーマ : 新規登録用 */
export const newRepertoireSchema = z.object({
  /** トラック ID (`tracks.id` を紐付ける・`null` 許容) */
  track_id    : z.preprocess(
                  preprocessNullableNumber,
                  z.number({ error: zodErrorMessages.invalidType(trackIdDisplayName) })
                    .int({ error: zodErrorMessages.integer(trackIdDisplayName) })
                    .min(1, { error: zodErrorMessages.minimumNumber(trackIdDisplayName, 1) })
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
                  z.enum(repertoirePartValues, { error: zodErrorMessages.empty(partDisplayName) })
                ),
  /** 習熟度 (`null` 許容) */
  proficiency : z.preprocess(
                  value => isEmpty(value) ? null : preprocessOneLineString(value),
                  z.enum(repertoireProficiencyValues)
                    .nullable()
                ),
  /** メモ (複数行・`null` 許容) */
  memo        : z.preprocess(
                  value => isEmpty(value) ? null : preprocessMultiLinesString(value),
                  z.string({ error: zodErrorMessages.invalidType(memoDisplayName) })
                    .nullable()
                )
});

/** レパートリーとレパートリーリンクを一括登録するためのスキーマ */
export const createRepertoireSchema = newRepertoireSchema.extend({
  repertoire_links: z.preprocess(
    value => Array.isArray(value)
      ? value.filter(link => {
          if(link == null || typeof link !== 'object' || Array.isArray(link)) return true;
          const fields = link as Record<string, unknown>;
          return ['type', 'url', 'title', 'memo'].some(field => !isEmpty(fields[field]));
        })
      : value,
    z.array(newRepertoireLinkSchema.omit({ repertoire_id: true }))
  )
});

/** レパートリーとレパートリーリンクの更新入力・トラック ID は未紐付けからの紐付け時のみ指定する */
export const updateRepertoireSchema = createRepertoireSchema.omit({ track_id: true }).extend({
  track_id: newRepertoireSchema.shape.track_id
    .refine(trackId => trackId != null, { error: zodErrorMessages.invalidType(trackIdDisplayName) })
    .optional()
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
export type NewRepertoire    = z.infer<typeof newRepertoireSchema>;
/** レパートリーとレパートリーリンクの一括登録入力 */
export type CreateRepertoire = z.infer<typeof createRepertoireSchema>;
/** レパートリーとレパートリーリンクの更新入力 */
export type UpdateRepertoire = z.infer<typeof updateRepertoireSchema>;
/** `repertoires` テーブルの型 : 新規登録後 */
export type Repertoire       = z.infer<typeof repertoireSchema>;
