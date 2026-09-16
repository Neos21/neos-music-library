import z from 'zod';

import { preprocessMultiLinesString, zodErrorMessages } from './schema-utilities';

export const commentDisplayName = 'コメント' as const;

/** `tracks` テーブルのスキーマ : Web アプリで編集可能なのは `comment` のみ */
export const trackSchema = z.object({
  /** トラック ID */
  id: z.number(),
  
  /** アーティスト名 */
  artist: z.string().nullable(),
  /** アルバム名 */
  album: z.string().nullable(),
  /** トラック番号 */
  track_number: z.number(),
  /** 曲名 */
  title: z.string(),
  
  /** Persistent ID High */
  persistent_id_high: z.number(),
  /** Persistent ID Low */
  persistent_id_low: z.number(),
  
  /** Web アプリで入力されたコメント : ID3 タグとしては CR+LF だが Web 上での入力や取り扱いは LF に統一する */
  comment : z.preprocess(
              (value: unknown) => value == null ? null : preprocessMultiLinesString(value),
              z.string({ error: zodErrorMessages.invalidType(commentDisplayName) })
                .nullable()
            ),
  /** iTunes ライブラリよりインポートしたコメント */
  imported_comment: z.string().nullable(),
  
  /** 初回作成日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  created_at: z.string().nullish(),
  /** 最終更新日時 (入力バリデーションしないので `null` と `undefined` も許容する) */
  updated_at: z.string().nullish()
});

/** `tracks` テーブルの型 */
export type Track = z.infer<typeof trackSchema>;
