import z from 'zod';

import { repertoireIdDisplayName } from './repertoire-schema';
import { preprocessMultiLinesString, preprocessOneLineString, zodErrorMessages } from './schema-utilities';
import { isEmpty } from '../helpers/is-empty';

export const repertoireLinkIdDisplayName = 'レパートリーリンク ID' as const;
export const typeDisplayName             = 'リンク種別'            as const;
export const urlDisplayName              = 'URL'                   as const;
export const titleDisplayName            = 'タイトル'              as const;
export const memoDisplayName             = 'メモ'                  as const;

/** `repertoire_links` テーブルのスキーマ : 新規登録用 */
export const newRepertoireLinkSchema = z.object({
  /** レパートリー ID (`repertoires.id` を紐付ける・`null` は許容しない) */
  repertoire_id : z.preprocess(
                    value => isEmpty(value) ? 0 : value,  // `null`・`undefined` は 0 扱いにしてエラーにする
                    z.coerce.number({ error: zodErrorMessages.invalidType(repertoireIdDisplayName) })
                      .int({ error: zodErrorMessages.integer(repertoireIdDisplayName) })
                      .min(1, { error: zodErrorMessages.minimumNumber(repertoireIdDisplayName, 1) })
                  ),
  /** リンク種別 */
  type          : z.preprocess(
                    preprocessOneLineString,
                    z.string({ error: zodErrorMessages.invalidType(typeDisplayName) })
                      .min(1, { error: zodErrorMessages.empty(typeDisplayName) })
                  ),
  /** URL */
  url           : z.preprocess(
                    preprocessOneLineString,
                    z.string({ error: zodErrorMessages.invalidType(urlDisplayName) })
                      .min(1, { error: zodErrorMessages.empty(urlDisplayName) })
                  ),
  /** タイトル */
  title         : z.preprocess(
                    preprocessOneLineString,
                    z.string({ error: zodErrorMessages.invalidType(titleDisplayName) })
                      .min(1, { error: zodErrorMessages.empty(titleDisplayName) })
                  ),
  /** メモ (複数行・`null` 許容) */
  memo          : z.preprocess(
                    preprocessMultiLinesString,
                    z.string({ error: zodErrorMessages.invalidType(memoDisplayName) })
                      .nullable()
                  )
});

/** `repertoire_links` テーブルのスキーマ : 新規登録後 */
export const repertoireLinkSchema = newRepertoireLinkSchema.extend({
  /** レパートリーリンク ID */
  id        : z.preprocess(
                value => isEmpty(value) ? 0 : value,  // `null`・`undefined` は 0 扱いにしてエラーにする
                z.coerce.number({ error: zodErrorMessages.invalidType(repertoireLinkIdDisplayName) })
                  .int({ error: zodErrorMessages.integer(repertoireLinkIdDisplayName) })
                  .min(1, { error: zodErrorMessages.minimumNumber(repertoireLinkIdDisplayName, 1) })
              ),
  /** 初回作成日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  created_at: z.string().nullish(),
  /** 最終更新日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  updated_at: z.string().nullish()
});

/** `repertoire_links` テーブルの型 : 新規登録用 */
export type NewRepertoireLink = z.infer<typeof newRepertoireLinkSchema>;
/** `repertoire_links` テーブルの型 : 新規登録後 */
export type RepertoireLink    = z.infer<typeof repertoireLinkSchema>;
