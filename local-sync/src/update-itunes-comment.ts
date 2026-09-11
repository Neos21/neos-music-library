import { extensionNameJson, updateItunesFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';

// --------------------------------------------------
// Update iTunes : 同期計画に基づき iTunes にコメントを反映する
// --------------------------------------------------

console.log(`[${jst()}] Update iTunes : Start`);

const logDirectoryPath = createLogDirectory();

/** 楽曲1件の iTunes への反映結果を示す型 */
type UpdateTrackResult = {
  /** 反映が必要なデーアの取得元 */
  source: 'sync_plan' | 'comment_conflicts';
  /** 反映するコメントの値 : Sync Plan の場合は `d1_comment` を採用する・Comment Conflicts の場合は `resolution.value` を見る */
  comment: string | null;
  /**
   * 反映前に実際の MP3 ファイルから取得できたコメントの値
   * 
   * TODO : 念のため控えておく分には悪いことはないけど MP3 ファイルの操作数が増えるのが微妙かな
   * 
   * - Sync Plan の場合は `imported_comment` と `itunes_comment` の両方と一致しているはず
   * - Comment Conflicts の場合、少なくとも `imported_comment` とは一致しているはず
   * - 事前の JSON データと合致しているか否かのチェックはせず、上述の `comment` 値での反映は行ってしまう
   */
  before_comment: string | null;
};

/** Update iTunes スクリプトが出力する結果ファイルの型定義 */
type UpdateItunesResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** Sync Plan から取得した「iTunes への反映が必要」と判定された楽曲数 (`comment_decision.action` が `update_itunes` のデータ) */
    sync_plan_count: number;
    /** Comment Conflicts から取得した「iTunes への反映が必要」と判定された楽曲数 (`source` が `d1` か `manual` のデータ) */
    comment_conflicts_count: number;
    /** Sync Plan を元に iTunes への反映処理が成功した楽曲数 */
    updated_from_sync_plan: number;
    /** Comment Conflicts を元に iTunes への反映処理が成功した楽曲数 */
    updated_from_comment_conflicts: number;
  }
  /** iTunes への反映が成功した情報 */
  updated: Array<UpdateTrackResult>;
  /** エラー情報 */
  errors: Array<Partial<UpdateTrackResult> & { error: string; }>;
};

const result: UpdateItunesResult = {
  executed_at: jst(),
  status: 'failed',
  summary: {
    sync_plan_count: 0,
    comment_conflicts_count: 0,
    updated_from_sync_plan: 0,
    updated_from_comment_conflicts: 0
  },
  updated: [],
  errors: []
};

/** エラーログを出力しながら結果オブジェクトに追記する */
const errorLog = (message: string, error?: unknown): void => {
  if(error == null) {
    console.error(`[${jst()}] [ERROR] ${message}`);
    result.errors.push({ error: message });
  }
  else {
    console.error(`[${jst()}] [ERROR] ${message}`, error);
    result.errors.push({ error: `${message} : ${serializeError(error)}` });
  }
};

/** 結果ファイルを出力する */
const writeResult = (): void => {
  let data;
  try {
    data = JSON.stringify(result, null, 2) + '\n';
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] 結果オブジェクトの JSON 文字列化に失敗しました・結果ファイルが出力できません`, error);
  }
  if(data != null) {
    writeResultFile(logDirectoryPath, updateItunesFileName, extensionNameJson, result.executed_at, data);
  }
};

/** メイン関数 */
const main = (): void => {
  // TODO
};

(() => {
  try {
    main();
  }
  catch(error) {
    errorLog('メイン関数で想定外のエラーが発生しました', error);
    result.status = 'failed';
  }
  finally {
    writeResult();
    console.log(`[${jst()}] Update iTunes : Finished`);
  }
})();
