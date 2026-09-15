/**
 * iTunes ライブラリからエクスポートした1楽曲の型
 * 
 * - 必須入力項目のバリデーションなどは別途行う
 * - iTunes COM の仕様上、「アルバム名が iTunes 上で空欄」の時は `tracks.Item(i).Album` などが空文字ではなく `null` で返されるため、iTunes 上「空欄」にできる項目は `null` も想定しておく
 */
export type ItunesTrack = {
  /** アーティスト名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  artist: string | null;
  /** アルバム名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  album: string | null;
  /** トラック番号 : iTunes 上で「空欄」でも `0` が入るので `null` は想定しないでおく */
  track_number: number;
  /** 曲名 : iTunes 上で必ず1文字以上求められ空欄にはできないので `null` は付けないでおく */
  title: string;
  
  /** iTunes ライブラリの Persistent ID High */
  persistent_id_high: number;
  /** iTunes ライブラリの Persistent ID Low */
  persistent_id_low: number;
  
  /** iTunes ライブラリから取得したコメント・iTunes 上で「空欄」にできるため `null` を指定しておく・D1 の `tracks` テーブルのカラム名と予め合わせておく */
  imported_comment: string | null;
};

/** Export iTunes スクリプトが出力する結果ファイルの型定義 */
export type ItunesTracksResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** `iTunes.LibraryPlaylist.Tracks` で取得した全楽曲数 */
    total_tracks: number;
    /** `itunes_tracks` として正常に取得した楽曲数 */
    itunes_tracks: number;
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
