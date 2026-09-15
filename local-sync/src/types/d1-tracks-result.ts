import { D1Track } from '../schemas/d1-track.js';

/** Export D1 スクリプトが出力する結果ファイルの型定義 */
export type D1TracksResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** D1 から取得した総楽曲数 */
    total_tracks: number;
    /** Zod パースを通過した楽曲数 (通常は `total_tracks` と同一値になる想定) */
    d1_tracks: number;
    /** Zod パースに失敗した楽曲数 (通常は0件の想定) */
    invalid_tracks: number;
  };
  /** D1 から取得し Zod パースを通過した楽曲情報 */
  d1_tracks: Array<D1Track>;
  /** D1 から取得し Zod パースに失敗した楽曲情報 */
  invalid_tracks: Array<Partial<D1Track> & { warning: string; }>;
  /** その他ワーニング情報 */
  warnings: Array<{ warning: string; }>;
  /** エラー情報 */
  errors: Array<{ error: string; }>;
};
