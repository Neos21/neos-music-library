import z from 'zod';

/** D1 の `tracks` テーブルの1レコードに相当するスキーマ */
export const d1TrackSchema = z.object({
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
  
  /** Web アプリで入力されたコメント */
  comment: z.string().nullable(),
  /** iTunes ライブラリよりインポートしたコメント */
  imported_comment: z.string().nullable()
});

/** D1 の `tracks` テーブルの1レコードに相当する型 */
export type D1Track = z.infer<typeof d1TrackSchema>;
