import { ItunesTrack } from './itunes-track.js';
import { D1Track } from '../schemas/d1-track.js';

/** メタデータの差分有無・更新内容を分類する */
export type MetadataDecision =
  | {
      /** メタデータ差分なし */
      action: 'unchanged';
      /** `unchanged` の時は `changes` プロパティを置かせない */
      changes?: never;
    }
  | {
      /** メタデータ差分アリ・D1 への UPDATE が必要 */
      action: 'update_d1';
      /** Key に UPDATE 対象カラム名・Value に値を指定し UPDATE 文が構築できるようにする */
      changes: Record<string, string | number | null>;
    };

/** コメントの差分有無・更新方針 */
export type CommentDecision =
  | {
      /** コメント差分なし */
      action: 'unchanged';
      /** `unchanged` の時は不要 */
      imported_comment?: never;
      /** `unchanged` の時は不要 */
      d1_comment?: never;
      /** `unchanged` の時は不要 */
      itunes_comment?: never;
    }
  | {
      /**
       * コメント差分アリ
       * 
       * - `update_itunes` : D1 の `comment` に新しい値がある場合 … iTunes に反映が必要 → 反映成功時に D1 の `imported_comment` を UPDATE して「同期済・差分なし」とみなせるようにする必要がある
       * - `update_d1`     : iTunes に新しい値がある場合 … D1 の `comment` と `imported_comment` に同値を UPDATE して「同期済・差分なし」とみなせるようにする必要がある
       * - `conflict`      : コンフリクト検出 (自動判定不可)
       */
      action: 'update_itunes' | 'update_d1' | 'conflict';
      /** D1 より取得した旧 iTunes のコメント */
      imported_comment: string | null;
      /** D1 より取得したコメント */
      d1_comment: string | null;
      /** iTunes ライブラリより取得した現在のコメント */
      itunes_comment: string | null;
    };

/** Create Sync Plan スクリプトが出力する結果ファイルの型定義 */
export type SyncPlanResult = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** JSON から取得した楽曲数 */
    source_counts: {
      /** iTunes ライブラリの楽曲数 */
      itunes_tracks: number;
      /** D1 の楽曲数 */
      d1_tracks: number;
    };
    /** 分類 (Persistent ID で突合した結果) */
    reconciliation: {
      /** iTunes にあって D1 にない楽曲数 → D1 への INSERT 対象 */
      inserts: number;
      /** D1 にあって iTunes にない楽曲数 → D1 への DELETE 対象 */
      deletes: number;
      /** iTunes と D1 の両方にある楽曲数 → 変更なし・状態に応じて iTunes への反映・D1 への UPDATE・コンフリクト解消があり得る */
      matched: number;
    };
    /** iTunes と D1 の両方にある楽曲の分類 */
    matched_tracks: {
      /** メタデータ (アーティスト名・アルバム名・トラック番号・曲名)・コメントともに差分なし・操作不要な楽曲数 */
      fully_unchanged: number;
      
      /** メタデータの差分がない楽曲数 */
      metadata_unchanged: number;
      /** メタデータに差分があり、D1 に UPDATE する必要がある楽曲数 */
      metadata_update_d1: number;
      
      /** コメントの差分がない楽曲数 */
      comment_unchanged: number;
      /** コメントに差分があり、D1 の内容を iTunes に反映する必要がある楽曲数 */
      comment_update_itunes: number;
      /** コメントに差分があり、iTunes の内容を D1 に UPDATE する必要がある楽曲数 */
      comment_update_d1: number;
      /** コメントにコンフリクトがあり、手動解決が必要な楽曲数 */
      comment_conflicts: number;
    };
    /** 必要な操作数 */
    operations: {
      /** D1 に INSERT する件数 */
      insert_d1: number;
      /** D1 に DELETE する件数 */
      delete_d1: number;
      /** D1 にメタデータを UPDATE する件数 */
      update_metadata_d1: number;
      /** iTunes にコメントを反映する件数 */
      update_comment_itunes: number;
      /** D1 にコメントを UPDATE する件数 */
      update_comment_d1: number;
    };
  };
  /** D1 に INSERT する楽曲情報 */
  inserts: Array<ItunesTrack>;
  /** D1 に DELETE する楽曲情報 */
  deletes: Array<D1Track>;
  /** iTunes と D1 の両方にある楽曲の情報 */
  matched: Array<{
    /** D1 Track ID */
    d1_track_id: number;
    /** Persistent ID High */
    persistent_id_high: number;
    /** Persistent ID Low */
    persistent_id_low: number;
    
    /** メタデータの差分有無・更新内容 */
    metadata_decision: MetadataDecision;
    /** コメントの差分有無・更新方針 */
    comment_decision: CommentDecision;
  }>;
  /** エラー情報 */
  errors: Array<{ error: string; }>;
};

/** コメントコンフリクト修正用ファイルの型定義 */
export type CommentConflictsResult = {
  /** 実行時刻 */
  executed_at: string;
  /** コンフリクトの有無 : `no_conflicts` なら後続処理ではこのファイルの詳細を参照しなくて良い */
  status: 'has_conflicts' | 'no_conflicts';
  /** 実行結果サマリ */
  summary: {
    /** コンフリクト検出件数 */
    conflicts: number;
  },
  /** コンフリクト情報 */
  conflicts: Array<{
    /** D1 Track ID */
    d1_track_id: number;
    /** Persistent ID High */
    persistent_id_high: number;
    /** Persistent ID Low */
    persistent_id_low: number;
    
    /** D1 より取得した旧 iTunes のコメント */
    imported_comment: string | null;
    /** D1 より取得したコメント */
    d1_comment: string | null;
    /** iTunes ライブラリより取得した現在のコメント */
    itunes_comment: string | null;
    
    /** 人間が判定した結果を入力する欄 */
    resolution: {
      /**
       * 人間が採用する値を書き込む : ファイル出力時は `null`
       * 
       * - 空欄 (`null`) に更新したい場合もあり得るので `source` が `null` でないことをチェックする
       */
      value: null | string;
      /**
       * 採用した値の出典 : ファイル出力時は `null`
       * 
       * - D1 の値を採用したら `d1` を指定し、iTunes への反映を行う
       * - iTunes の値を採用したら `itunes` を指定し、D1 への UPDATE を行う
       * - どちらでもない新たな値を採用したら `manual` を指定し、iTunes への反映と D1 への UPDATE を行う
       */
      source: null | 'd1' | 'itunes' | 'manual';
    }
  }>;
};
