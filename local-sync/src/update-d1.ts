import Cloudflare from 'cloudflare';
import fs from 'node:fs';
import path from 'node:path';

import { cloudflareAccountId, conflictsFileName, d1DatabaseId, extensionNameJson, syncPlanFileName, updateD1FileName, updateItunesFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';
import { isConflictResolutionComplete, validateConflictsResult } from './lib/validate-comment-conflicts-result.js';
import { writeResultFile } from './lib/write-result-file.js';
import { D1Track } from './schemas/d1-track.js';
import { ItunesTrack } from './types/itunes-tracks-result.js';
import { Result } from './types/result.js';
import { ConflictedTrack, ConflictsResult, MatchedTrack, SyncPlanResult } from './types/sync-plan-result.js';
import { UpdateItunesResult, UpdateTrackResult } from './types/update-itunes-result.js';

// --------------------------------------------------
// Update D1 : 同期計画に基づき D1 を更新する
// --------------------------------------------------

console.log(`[${jst()}] Update D1 : Start`);

const logDirectoryPath = createLogDirectory();

/** 結果オブジェクト */
type UpdateD1Result = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** 同期計画から取得した「D1 への INSERT が必要」と判定された楽曲数 (`inserts` の件数) */
    sync_plan_inserts_count: number;
    /** 同期計画から取得した「D1 への DELETE が必要」と判定された楽曲数 (`deletes` の件数) */
    sync_plan_deletes_count: number;
    /** 同期計画から取得した「D1 へのメタデータの UPDATE が必要」と判定された楽曲数 (`metadata_decision.action` が `update_d1` の楽曲) */
    sync_plan_updates_metadata_count: number;
    /** 同期計画から取得した「D1 へのコメントの UPDATE が必要」と判定された楽曲数 (`comment_decision.action` が `update_d1` の楽曲) */
    sync_plan_updates_comment_count: number;
    /** コメントコンフリクト修正用ファイルから取得した「D1 への反映が必要」と判定された楽曲数 (`source` が `itunes` か `manual` の楽曲) */
    conflicts_updates_count: number;
    
    /** INSERT に成功した件数 */
    insert_succeeded: number;
    /** INSERT に失敗した件数 (QueryResult で `success` が `true` でなかった件数・通常はエラーが `throw` されるのでココは計上できず `errors` に詳細が出力されるはず) */
    insert_failed: number;
    /** DELETE に成功した件数 */
    delete_succeeded: number;
    /** DELETE に失敗した件数 */
    delete_failed: number;
    /** メタデータの UPDATE に成功した件数 */
    update_metadata_succeeded: number;
    /** メタデータの UPDATE に失敗した件数 */
    update_metadata_failed: number;
    /** コメントの UPDATE に成功した件数 */
    update_comment_succeeded: number;
    /** コメントの UPDATE に失敗した件数 */
    update_comment_failed: number;
    
    /** コンフリクトしていたコメントの UPDATE に成功した件数 */
    update_conflicted_comment_succeeded: number;
    /** コンフリクトしていたコメントの UPDATE に失敗した件数 */
    update_conflicted_comment_failed: number;
  },
  /** INSERT に失敗した際の生ログ (QueryResult で `success` が `true` でなかったデータ・通常はエラーが `throw` されるのでココにログ出力はされず `errors` に詳細が出力されるはず) */
  insert_failed_logs: Array<any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** DELETE に失敗した際の生ログ */
  delete_failed_logs: Array<any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** メタデータの UPDATE に失敗した際の生ログ */
  update_metadata_failed_logs: Array<any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** コメントの UPDATE に失敗した際の生ログ */
  update_comment_failed_logs: Array<any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** コンフリクトしていたコメントの UPDATE に失敗した際の生ログ */
  update_conflicted_comment_failed_logs: Array<any>;  // eslint-disable-line @typescript-eslint/no-explicit-any
  /** エラー情報 */
  errors: Array<{ error: string; }>;
};

const result: UpdateD1Result = {
  executed_at: jst(),
  status: 'failed',
  summary: {
    sync_plan_inserts_count: 0,
    sync_plan_deletes_count: 0,
    sync_plan_updates_metadata_count: 0,
    sync_plan_updates_comment_count: 0,
    conflicts_updates_count: 0,
    
    insert_succeeded: 0,
    insert_failed   : 0,
    delete_succeeded: 0,
    delete_failed   : 0,
    update_metadata_succeeded: 0,
    update_metadata_failed   : 0,
    update_comment_succeeded : 0,
    update_comment_failed    : 0,
    
    update_conflicted_comment_succeeded: 0,
    update_conflicted_comment_failed   : 0
  },
  insert_failed_logs: [],
  delete_failed_logs: [],
  update_metadata_failed_logs: [],
  update_comment_failed_logs: [],
  update_conflicted_comment_failed_logs: [],
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
    data = `${JSON.stringify(result, null, 2)}\n`;
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] 結果オブジェクトの JSON 文字列化に失敗しました・結果ファイルが出力できません`, error);
  }
  if(data != null) {
    writeResultFile(logDirectoryPath, updateD1FileName, extensionNameJson, result.executed_at, data);
  }
};

/** 環境変数を読み込んで Cloudflare クライアントを生成する */
const createCloudflareClient = (): Result<Cloudflare> => {
  try {
    process.loadEnvFile();
  }
  catch(error) {
    return { error: `\`.env\` ファイルが見つかりませんでした : ${serializeError(error)}` };
  }
  
  const d1ApiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
  if(d1ApiToken == null) return { error: '`.env` ファイルで `CLOUDFLARE_D1_API_TOKEN` を定義してください' };
  
  return { result: new Cloudflare({ apiToken: d1ApiToken }) };
};

/** 同期計画ファイルを取得する */
const loadSyncPlan = (): Result<SyncPlanResult> => {
  try {
    const text = fs.readFileSync(path.resolve(logDirectoryPath, `${syncPlanFileName}${extensionNameJson}`), 'utf-8');
    const json: SyncPlanResult = JSON.parse(text);
    
    // 最低限の続行不可能なエラーがないことをチェックする
    if(json.status === 'failed') {
      errorLog('同期計画ファイルが `failed` 状態でした・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load Sync Plan' };
    }
    if(json.errors.length > 0) {
      errorLog('同期計画ファイルに `errors` が出力されていました・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load Sync Plan' };
    }
    
    return { result: json };
  }
  catch(error) {
    errorLog('同期計画ファイルを読み込めませんでした', error);
    return { error: 'Failed To Load Sync Plan' };
  }
};

/** コメントコンフリクト修正用ファイルを取得する */
const loadConflicts = (): Result<ConflictsResult> => {
  try {
    const text = fs.readFileSync(path.resolve(logDirectoryPath, `${conflictsFileName}${extensionNameJson}`), 'utf-8');
    const json: ConflictsResult = JSON.parse(text);
    
    // ステータスと件数が一致しているか確認する
    const validationConflictsResult = validateConflictsResult(json);
    if(validationConflictsResult.error != null) return { error: validationConflictsResult.error };
    
    // コンフリクト解消作業が完了しているか確認する
    const isConflictResolutionCompleteResult = isConflictResolutionComplete(json);
    if(isConflictResolutionCompleteResult.error != null) return { error: isConflictResolutionCompleteResult.error };
    
    return { result: json };
  }
  catch(error) {
    errorLog('コメントコンフリクト修正用ファイルを読み込めませんでした', error);
    return { error: 'Failed To Load Conflicts' };
  }
};

/** iTunes へのコメント反映結果ファイルを取得する */
const loadUpdateItunes = (): Result<UpdateItunesResult> => {
  try {
    const text = fs.readFileSync(path.resolve(logDirectoryPath, `${updateItunesFileName}${extensionNameJson}`), 'utf-8');
    const json: UpdateItunesResult = JSON.parse(text);
    
    // 最低限の続行不可能なエラーがないことをチェックする
    if(json.status === 'failed') {
      errorLog('iTunes へのコメント反映結果ファイルが `failed` 状態でした・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load Update Itunes' };
    }
    if(json.errors.length > 0) {
      errorLog('iTunes へのコメント反映結果ファイルに `errors` が出力されていました・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load Update Itunes' };
    }
    
    return { result: json };
  }
  catch(error) {
    errorLog('iTunes へのコメント反映結果ファイルを読み込めませんでした', error);
    return { error: 'Failed To Load Update Itunes' };
  }
};

/** コメントコンフリクトの処理状況が妥当か検証する */
const validateConflicts = (matchedTracks: Array<MatchedTrack>, conflictedTracks: Array<ConflictedTrack>, updatedItunesTracks: Array<UpdateTrackResult>): Result<string> => {
  /** 実行計画でコンフリクト判定された楽曲数を取得する */
  const conflictInMatchedCount = matchedTracks.filter(matchedTrack => matchedTrack.comment_decision.action === 'conflict');
  if(conflictInMatchedCount.length !== conflictedTracks.length) return { error: '実行計画でコンフリクト判定された件数と、コメントコンフリクト修正用ファイルの件数が一致しません' };
  
  /** コメントコンフリクト修正用ファイルで iTunes へのコメント反映が必要とマークされた楽曲数を取得する */
  const updateItunesRequiredCount = conflictedTracks.filter(conflictedTrack => ['d1', 'manual'].includes(conflictedTrack.resolution.source!));
  /** コメントコンフリクト修正用ファイルを元にして iTunes に反映された楽曲数を取得する */
  const updatedTracks = updatedItunesTracks.filter(updatedItunesTrack => updatedItunesTrack.source === 'conflicts');
  if(updateItunesRequiredCount.length !== updatedTracks.length) return { error: 'コメントコンフリクト修正用ファイルで iTunes へのコメント反映が必要とマークされた件数と、iTunes へのコメント反映件数が一致しません' };
  
  /** 本スクリプトで D1 への UPDATE 対象となる件数を取得する */
  const updateD1RequiredCount = conflictedTracks.filter(commentConflictedTrack => ['itunes', 'manual'].includes(commentConflictedTrack.resolution.source!));
  
  if(updatedTracks.length > 0) {
    return { result: `コンフリクトしたコメントは全て iTunes への反映が完了しています (${updatedTracks.length} 件)・D1 へのコンフリクト解消のための UPDATE が必要な楽曲は ${updateD1RequiredCount.length} 件です` };
  }
  else if(updateD1RequiredCount.length > 0) {
    return { result: `コンフリクトしたコメントについて iTunes への反映が必要な楽曲はありません・D1 へのコンフリクト解消のための UPDATE が必要な楽曲があります (${updateD1RequiredCount.length} 件)` };
  }
  else {
    return { result: 'コンフリクトしたコメントはありません' };
  }
};

/** D1 への INSERT 操作を行う */
const insertToD1 = async (cloudflare: Cloudflare, itunesTracks: Array<ItunesTrack>): Promise<void> => {
  result.summary.sync_plan_inserts_count = itunesTracks.length;
  if(itunesTracks.length === 0) return console.log(`[${jst()}] INSERT 対象件数が0件のため INSERT は発生しませんでした`);
  console.log(`[${jst()}] INSERT 対象件数 : ${itunesTracks.length} 件`);
  
  const batch = itunesTracks.map(itunesTrack => ({
    sql: 'INSERT INTO tracks (artist, album, track_number, title, persistent_id_high, persistent_id_low, comment, imported_comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    params: [
      itunesTrack.artist ?? null,
      itunesTrack.album  ?? null,
      itunesTrack.track_number,
      itunesTrack.title,
      itunesTrack.persistent_id_high,
      itunesTrack.persistent_id_low,
      itunesTrack.imported_comment ?? null,
      itunesTrack.imported_comment ?? null
    ] as unknown as Array<string>  // SDK の型定義が `params? : Array<string>;` となっているのでキャストする
  }));
  
  /** 1回のバッチ処理で実行する件数 */
  const batchSize = 100;
  
  for(let i = 0; i < batch.length; i += batchSize) {
    console.log(`[${jst()}] INSERT バッチ処理 ${i} 件目開始`);
    try {
      const chunk = batch.slice(i, i + batchSize);
      const queryResult = await cloudflare.d1.database.query(d1DatabaseId, {
        account_id: cloudflareAccountId,
        batch: chunk
      });
      
      const succeeded = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success === true);
      const failed    = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success !== true);
      result.summary.insert_succeeded += succeeded.length;
      result.summary.insert_failed    += failed.length;
      if(failed.length > 0) {
        result.insert_failed_logs.push(failed);
        errorLog(`INSERT バッチ処理 ${i} 件目中に失敗のレスポンスが含まれています・詳細は \`insert_failed_logs\` を確認してください`);
      }
    }
    catch(error) {
      errorLog(`INSERT バッチ処理 ${i} 件目でエラーが発生しました・後続の INSERT 処理は中断します`, error);
      break;
    }
  }
  
  if(batch.length === result.summary.insert_succeeded) {
    console.log(`[${jst()}] INSERT バッチ処理が全件成功しました`);
  }
  else {
    errorLog('INSERT バッチ処理が全件成功しませんでした');
  }
};

/** D1 への DELETE 操作を行う */
const deleteToD1 = async (cloudflare: Cloudflare, d1Tracks: Array<D1Track>): Promise<void> => {
  result.summary.sync_plan_deletes_count = d1Tracks.length;
  if(d1Tracks.length === 0) return console.log(`[${jst()}] DELETE 対象件数が0件のため DELETE は発生しませんでした`);
  console.log(`[${jst()}] DELETE 対象件数 : ${d1Tracks.length} 件`);
  
  /** 1回のバッチ処理で実行する件数 : D1 は1クエリあたりの Bound Parameters が最大100個なので `IN` 句を100件以内に抑えること */
  const batchSize = 100;
  
  for(let i = 0; i < d1Tracks.length; i += batchSize) {
    console.log(`[${jst()}] DELETE バッチ処理 ${i} 件目開始`);
    try {
      const chunk = d1Tracks.slice(i, i + batchSize);
      
      /** ID の配列 */
      const ids = chunk.map(d1Track => d1Track.id);
      /** ID の配列に対応する `IN` 句を作る */
      const inClausePlaceholder = ids.map(() => '?').join(', ');
      
      // 紐付くレパートリーテーブルがあれば同時に UPDATE している
      const queryResult = await cloudflare.d1.database.query(d1DatabaseId, {
        account_id: cloudflareAccountId,
        batch: [
          {
            sql: `UPDATE repertoires SET track_id = NULL WHERE track_id IN (${inClausePlaceholder})`,
            params: ids as unknown as Array<string>
          },
          {
            sql: `DELETE FROM tracks WHERE id IN (${inClausePlaceholder})`,
            params: ids as unknown as Array<string>
          }
        ]
      });
      
      const failed = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success !== true);
      result.summary.delete_succeeded += ids.length;  // `IN` 句を使っているため「処理に成功した楽曲数」とみなせるようにする・ココは万が一以下の `failed` が発生した場合はそちらとの件数が一致しなくなる
      result.summary.delete_failed    += failed.length;  // `IN` 句を使っているため「処理に失敗した楽曲数」とはイコールにならない点に注意
      if(failed.length > 0) {
        result.delete_failed_logs.push(failed);
        errorLog(`DELETE バッチ処理 ${i} 件目中に失敗のレスポンスが含まれています・詳細は \`delete_failed_logs\` を確認してください`);
      }
    }
    catch(error) {
      errorLog(`DELETE バッチ処理 ${i} 件目でエラーが発生しました・後続の DELETE 処理は中断します`, error);
      break;
    }
  }
  
  if(d1Tracks.length === result.summary.delete_succeeded) {
    console.log(`[${jst()}] DELETE バッチ処理が全件成功しました`);
  }
  else {
    errorLog('DELETE バッチ処理が全件成功しませんでした');
  }
};

/** D1 へのメタデータの UPDATE 操作を行う */
const updateMetadataToD1 = async (cloudflare: Cloudflare, matchedTracks: Array<MatchedTrack>): Promise<void> => {
  const tracksToUpdate = matchedTracks.filter(matchedTrack => matchedTrack.metadata_decision.action === 'update_d1');
  result.summary.sync_plan_updates_metadata_count = tracksToUpdate.length;
  if(tracksToUpdate.length === 0) return console.log(`[${jst()}] メタデータ UPDATE 対象件数が0件のため UPDATE は発生しませんでした`);
  console.log(`[${jst()}] メタデータ UPDATE 対象件数 : ${tracksToUpdate.length} 件`);
  
  // 万が一 `changes` プロパティがなかったらエラーに繋がるので留意
  const batch = tracksToUpdate.map(trackToUpdate => {
    const setClauses: Array<string> = [];
    const params: Array<string | number | null> = [];
    
    Object.entries(trackToUpdate.metadata_decision.changes!).forEach(([columnName, value]) => {
      setClauses.push(`${columnName} = ?`);
      params.push(value);
    });
    
    setClauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(trackToUpdate.d1_track_id);
    
    return {
      sql: `UPDATE tracks SET ${setClauses.join(', ')} WHERE id = ?`,
      params: params as unknown as Array<string>
    };
  });
  
  /** 1回のバッチ処理で実行する件数 */
  const batchSize = 100;
  
  for(let i = 0; i < batch.length; i += batchSize) {
    console.log(`[${jst()}] メタデータ UPDATE バッチ処理 ${i} 件目開始`);
    try {
      const chunk = batch.slice(i, i + batchSize);
      const queryResult = await cloudflare.d1.database.query(d1DatabaseId, {
        account_id: cloudflareAccountId,
        batch: chunk
      });
      
      const succeeded = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success === true);
      const failed    = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success !== true);
      result.summary.update_metadata_succeeded += succeeded.length;
      result.summary.update_metadata_failed    += failed.length;
      if(failed.length > 0) {
        result.update_metadata_failed_logs.push(failed);
        errorLog(`メタデータ UPDATE バッチ処理 ${i} 件目中に失敗のレスポンスが含まれています・詳細は \`update_metadata_failed_logs\` を確認してください`);
      }
    }
    catch(error) {
      errorLog(`メタデータ UPDATE バッチ処理 ${i} 件目でエラーが発生しました・後続の UPDATE 処理は中断します`, error);
      break;
    }
  }
  
  if(batch.length === result.summary.update_metadata_succeeded) {
    console.log(`[${jst()}] メタデータ UPDATE バッチ処理が全件成功しました`);
  }
  else {
    errorLog('メタデータ UPDATE バッチ処理が全件成功しませんでした');
  }
};

/** D1 へのコメントの UPDATE 操作を行う */
const updateCommentToD1 = async (cloudflare: Cloudflare, matchedTracks: Array<MatchedTrack>): Promise<void> => {
  const tracksToUpdate = matchedTracks.filter(matchedTrack => matchedTrack.comment_decision.action === 'update_d1');
  result.summary.sync_plan_updates_comment_count = tracksToUpdate.length;
  if(tracksToUpdate.length === 0) return console.log(`[${jst()}] コメント UPDATE 対象件数が0件のため UPDATE は発生しませんでした`);
  console.log(`[${jst()}] コメント UPDATE 対象件数 : ${tracksToUpdate.length} 件`);
  
  const batch = tracksToUpdate.map(trackToUpdate => ({
    sql: 'UPDATE tracks SET comment = ?, imported_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    params: [trackToUpdate.comment_decision.itunes_comment ?? null, trackToUpdate.comment_decision.itunes_comment ?? null, trackToUpdate.d1_track_id] as unknown as Array<string>
  }));
  
  /** 1回のバッチ処理で実行する件数 */
  const batchSize = 100;
  
  for(let i = 0; i < batch.length; i += batchSize) {
    console.log(`[${jst()}] コメント UPDATE バッチ処理 ${i} 件目開始`);
    try {
      const chunk = batch.slice(i, i + batchSize);
      const queryResult = await cloudflare.d1.database.query(d1DatabaseId, {
        account_id: cloudflareAccountId,
        batch: chunk
      });
      
      const succeeded = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success === true);
      const failed    = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success !== true);
      result.summary.update_comment_succeeded += succeeded.length;
      result.summary.update_comment_failed    += failed.length;
      if(failed.length > 0) {
        result.update_comment_failed_logs.push(failed);
        errorLog(`コメント UPDATE バッチ処理 ${i} 件目中に失敗のレスポンスが含まれています・詳細は \`update_comment_failed_logs\` を確認してください`);
      }
    }
    catch(error) {
      errorLog(`コメント UPDATE バッチ処理 ${i} 件目でエラーが発生しました・後続の UPDATE 処理は中断します`, error);
      break;
    }
  }
  
  if(batch.length === result.summary.update_comment_succeeded) {
    console.log(`[${jst()}] コメント UPDATE バッチ処理が全件成功しました`);
  }
  else {
    errorLog('コメント UPDATE バッチ処理が全件成功しませんでした');
  }
};

/** D1 へのコンフリクトしていたコメントの UPDATE 操作を行う */
const updateConflictedCommentToD1 = async (cloudflare: Cloudflare, commentConflictedTracks: Array<ConflictedTrack>): Promise<void> => {
  const tracksToUpdate = commentConflictedTracks.filter(commentConflictedTrack => ['itunes', 'manual'].includes(commentConflictedTrack.resolution.source!));
  result.summary.conflicts_updates_count = tracksToUpdate.length;
  if(tracksToUpdate.length === 0) return console.log(`[${jst()}] コンフリクトしていたコメントの UPDATE 対象件数が0件のため UPDATE は発生しませんでした`);
  console.log(`[${jst()}] コンフリクトしていたコメント UPDATE 対象件数 : ${tracksToUpdate.length} 件`);
  
  const batch = tracksToUpdate.map(trackToUpdate => ({
    sql: 'UPDATE tracks SET comment = ?, imported_comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    params: [trackToUpdate.resolution.value ?? null, trackToUpdate.resolution.value ?? null, trackToUpdate.d1_track_id] as unknown as Array<string>
  }));
  
  /** 1回のバッチ処理で実行する件数 */
  const batchSize = 100;
  
  for(let i = 0; i < batch.length; i += batchSize) {
    console.log(`[${jst()}] コンフリクトしていたコメント UPDATE バッチ処理 ${i} 件目開始`);
    try {
      const chunk = batch.slice(i, i + batchSize);
      const queryResult = await cloudflare.d1.database.query(d1DatabaseId, {
        account_id: cloudflareAccountId,
        batch: chunk
      });
      
      const succeeded = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success === true);
      const failed    = queryResult.result.filter(queryResultOneLine => queryResultOneLine.success !== true);
      result.summary.update_conflicted_comment_succeeded += succeeded.length;
      result.summary.update_conflicted_comment_failed    += failed.length;
      if(failed.length > 0) {
        result.update_conflicted_comment_failed_logs.push(failed);
        errorLog(`コンフリクトしていたコメント UPDATE バッチ処理 ${i} 件目中に失敗のレスポンスが含まれています・詳細は \`update_conflicted_comment_failed_logs\` を確認してください`);
      }
    }
    catch(error) {
      errorLog(`コンフリクトしていたコメント UPDATE バッチ処理 ${i} 件目でエラーが発生しました・後続の UPDATE 処理は中断します`, error);
      break;
    }
  }
  
  if(batch.length === result.summary.update_conflicted_comment_succeeded) {
    console.log(`[${jst()}] コンフリクトしていたコメント UPDATE バッチ処理が全件成功しました`);
  }
  else {
    errorLog('コンフリクトしていたコメント UPDATE バッチ処理が全件成功しませんでした');
  }
};

/** メイン関数 */
const main = async (): Promise<void> => {
  const cloudflareClientResult = createCloudflareClient();
  if(cloudflareClientResult.error != null) return errorLog(cloudflareClientResult.error);
  
  const syncPlanResult = loadSyncPlan();
  if(syncPlanResult.error != null) return;
  const conflictsResult = loadConflicts();
  if(conflictsResult.error != null) return;
  const updateItunesResult = loadUpdateItunes();
  if(updateItunesResult.error != null) return;
  
  const cloudflare = cloudflareClientResult.result;
  const syncPlan = syncPlanResult.result;
  const conflicts = conflictsResult.result;
  const updateItunes = updateItunesResult.result;
  
  // コメントコンフリクト修正用ファイルと iTunes へのコメント反映結果ファイルを突合し、事前に iTunes へのコメント反映が済んでいることを確認する
  const validationResult = validateConflicts(syncPlan.matched, conflicts.conflicts, updateItunes.updated);
  if(validationResult.error != null) return errorLog(validationResult.error);
  console.log(`[${jst()}] ${validationResult.result}`);
  
  // NOTE : Cloudflare API は5分間に1200リクエストの制限がある
  // NOTE : D1 は1アカウントにつき、1日10万行の書き込み制限がある
  // NOTE : そのため各種 API コールは一定件数でバッチ処理している・1回のバッチ処理は1件でも失敗した SQL があると全体がロールバックされる
  await insertToD1(cloudflare, syncPlan.inserts);
  await deleteToD1(cloudflare, syncPlan.deletes);
  await updateMetadataToD1(cloudflare, syncPlan.matched);
  await updateCommentToD1(cloudflare, syncPlan.matched);
  // コンフリクトしていたコメントについて iTunes への反映が済んでいる楽曲の情報を D1 に UPDATE する
  await updateConflictedCommentToD1(cloudflare, conflicts.conflicts);
  
  if(result.errors.length === 0) {
    result.status = 'success';
    console.log(`[${jst()}] 全件正常終了`);
  }
};

(async () => {
  try {
    await main();
  }
  catch(error) {
    errorLog('メイン関数で想定外のエラーが発生しました', error);
    result.status = 'failed';
  }
  finally {
    writeResult();
    console.log(`[${jst()}] Update D1 : Finished`);
  }
})();
