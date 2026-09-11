import { ItunesTrack } from './itunes-track.js';

/** Export iTunes スクリプトが出力する結果ファイルの型定義 */
export type ItunesTracksResult = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** `iTunes.LibraryPlaylist.Tracks` で取得した全楽曲数 */
    total_tracks: number;
    /** `raw_itunes_tracks` として出力した楽曲数 */
    exported_tracks: number;
    /** Podcast と判定して除外した数 */
    podcast_tracks: number;
    /** 重複の検知数 (楽曲数ではなく「2つ重複している」でも「3つ重複している」でもそれぞれ 1 とカウントする) */
    duplicates: number;
    /** バリデーションで Warning を確認した楽曲数 */
    warning_tracks: number;
    /** 処理中にエラーが発生した楽曲数 */
    error_tracks: number;
  };
  /** iTunes から取得した楽曲情報 */
  itunes_tracks: Array<ItunesTrack>;
  /** 重複している楽曲の情報 */
  duplicates: Array<{ count: number; tracks: Array<ItunesTrack>; }>;
  /** バリデーションエラーなどワーニング情報 */
  warnings: Array<Partial<ItunesTrack> & ({ warnings: Array<string>; } | { warning: string; })>;
  /** エラー情報 */
  errors: Array<Partial<ItunesTrack> & { error: string; }>;
};
