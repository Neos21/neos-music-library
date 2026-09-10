import { RawItunesTrack } from './raw-itunes-track.js';

/** Export iTunes Library スクリプトが出力する結果ファイルの型定義 */
export type RawItunesTracksJson = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Warning・Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** `iTunes.LibraryPlaylist.Tracks` で取得した全トラック数 */
    total_tracks: number;
    /** `raw_itunes_tracks` として出力したトラック数 */
    exported_tracks: number;
    /** Podcast のトラックと判定して除外したトラック数 */
    podcast_tracks: number;
    /** 重複の検知数 (曲数ではなく「2つ重複している」でも「3つ重複している」でもそれぞれ 1 とカウントする) */
    duplicates: number;
    /** バリデーションで Warning を確認したトラック数 */
    warning_tracks: number;
    /** 処理中にエラーが発生したトラック数 */
    error_tracks: number;
  };
  /** iTunes から取得したトラック情報 */
  raw_itunes_tracks: Array<RawItunesTrack>;
  /** 重複している曲の情報 */
  duplicates: Array<{ count: number; tracks: Array<RawItunesTrack>; }>;
  /** バリデーションエラーなどワーニング情報 */
  warnings: Array<Partial<RawItunesTrack> & { warnings?: Array<string>; warning?: string; }>;
  /** エラー情報 */
  errors: Array<Partial<RawItunesTrack> & { error: string; }>;
};
