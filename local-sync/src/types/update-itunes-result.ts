/** 楽曲1件の iTunes への反映結果を示す型 */
export type UpdateTrackResult = {
  /** D1 トラック ID */
  d1_track_id: number;
  /** Persistent ID High */
  persistent_id_high: number;
  /** Persistent ID Low */
  persistent_id_low: number;
  
  /** 反映したコメントの取得元 */
  source: 'sync_plan' | 'conflicts';
  /** 反映したコメントの値 : 同期計画の場合は `d1_comment` を採用する・コメントコンフリクト修正用ファイルの場合は `resolution.value` を見る */
  comment: string | null;
};

/** Update iTunes スクリプトが出力する結果ファイルの型定義 */
export type UpdateItunesResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** 同期計画から取得した「iTunes へのコメント反映が必要」と判定された楽曲数 (`comment_decision.action` が `update_itunes` の楽曲) */
    sync_plan_count: number;
    /** コメントコンフリクト修正用ファイルから取得した「iTunes へのコメント反映が必要」と判定された楽曲数 (`source` が `d1` か `manual` の楽曲) */
    conflicts_count: number;
    /** 同期計画を元に iTunes へのコメント反映処理が成功した楽曲数 */
    updated_from_sync_plan: number;
    /** コメントコンフリクト修正用ファイルを元に iTunes へのコメント反映処理が成功した楽曲数 */
    updated_from_conflicts: number;
  }
  /** iTunes へのコメント反映が成功した情報 */
  updated: Array<UpdateTrackResult>;
  /** エラー情報 */
  errors: Array<Partial<UpdateTrackResult> & { error: string; }>;
};
