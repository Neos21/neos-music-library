import { D1Track } from '../schemas/d1-track.js';

/** Load D1 Tracks スクリプトが出力する結果ファイルの型定義 */
export type D1TracksJson = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** D1 から取得した総トラック数 */
    total_tracks: number;
    /** Zod パースを通過したトラック数 (通常は `total_tracks` と同一値になる想定) */
    valid_tracks: number;
    /** Zod パースに失敗したトラック数 (通常は0件の想定) */
    invalid_tracks: number;
  };
  /** D1 から取得し Zod パースを通過したトラック情報 */
  valid_tracks: Array<D1Track>;
  /** D1 から取得し Zod パースに失敗したトラック情報 */
  invalid_tracks: Array<Partial<D1Track> & { warning: string; }>;
  /** その他ワーニング情報 */
  warnings: Array<{ warning: string; }>;
  /** エラー情報 */
  errors: Array<{ error: string; }>;
};
