import z from 'zod';

/** `tracks` テーブルのスキーマ : Web アプリで編集可能なのは `comment` のみ */
export const trackSchema = z.object({
  /** D1 トラック ID */
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
  
  /** Web アプリで入力されたコメント : 入力値の Trim や改行コードの調整・`null` への調整は事前に行うこととする */
  comment: z.string().nullable(),
  /** iTunes ライブラリよりインポートしたコメント */
  imported_comment: z.string().nullable(),
  
  /** 初回作成日時 */
  created_at: z.string(),
  /** 最終更新日時 */
  updated_at: z.string()
});

/** `tracks` テーブルの型 */
export type Track = z.infer<typeof trackSchema>;
