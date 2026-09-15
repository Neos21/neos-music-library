/** 楽曲1件の iTunes への反映結果を示す型 */
export type UpdateTrackResult = {
  /** D1 トラック ID */
  d1_track_id: number;
  /** Persistent ID High */
  persistent_id_high: number;
  /** Persistent ID Low */
  persistent_id_low: number;
  
  /** 反映したデータの取得元 */
  source: 'sync_plan' | 'comment_conflicts';
  /** 反映したコメントの値 : Sync Plan の場合は `d1_comment` を採用する・Comment Conflicts の場合は `resolution.value` を見る */
  comment: string | null;
};

/** Update iTunes Comment スクリプトが出力する結果ファイルの型定義 */
export type UpdateItunesCommentResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** Sync Plan から取得した「iTunes へのコメント反映が必要」と判定された楽曲数 (`comment_decision.action` が `update_itunes` のデータ) */
    sync_plan_count: number;
    /** Comment Conflicts から取得した「iTunes へのコメント反映が必要」と判定された楽曲数 (`source` が `d1` か `manual` のデータ) */
    comment_conflicts_count: number;
    /** Sync Plan を元に iTunes へのコメント反映処理が成功した楽曲数 */
    updated_from_sync_plan: number;
    /** Comment Conflicts を元に iTunes へのコメント反映処理が成功した楽曲数 */
    updated_from_comment_conflicts: number;
  }
  /** iTunes へのコメント反映が成功した情報 */
  updated: Array<UpdateTrackResult>;
  /** エラー情報 */
  errors: Array<Partial<UpdateTrackResult> & { error: string; }>;
};
