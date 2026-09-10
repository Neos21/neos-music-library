/** Load D1 Tracks スクリプトが出力する結果ファイルの型定義 */
export type D1TracksJson = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** D1 から取得したトラック情報 */
  tracks: Array<any>;  // TODO
  /** ワーニング情報 */
  warnings: Array<string>;
  /** エラー情報 */
  errors: Array<string>;
};
