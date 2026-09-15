import nodeId3 from 'node-id3';
import fs from 'node:fs';
import path from 'node:path';
import winax from 'winax';

import { conflictsFileName, extensionNameJson, syncPlanFileName, updateItunesFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';
import { isConflictResolutionComplete, validateConflictsResult } from './lib/validate-comment-conflicts-result.js';
import { writeResultFile } from './lib/write-result-file.js';
import { Result } from './types/result.js';
import { ConflictedTrack, ConflictsResult, MatchedTrack, SyncPlanResult } from './types/sync-plan-result.js';
import { UpdateItunesResult, UpdateTrackResult } from './types/update-itunes-result.js';

// --------------------------------------------------
// Update iTunes : 同期計画に基づき iTunes にコメントを反映する
// --------------------------------------------------

console.log(`[${jst()}] Update iTunes : Start`);

const logDirectoryPath = createLogDirectory();

const result: UpdateItunesResult = {
  executed_at: jst(),
  status: 'failed',
  summary: {
    sync_plan_count: 0,
    conflicts_count: 0,
    updated_from_sync_plan: 0,
    updated_from_conflicts: 0
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
    data = `${JSON.stringify(result, null, 2)}\n`;
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] 結果オブジェクトの JSON 文字列化に失敗しました・結果ファイルが出力できません`, error);
  }
  if(data != null) {
    writeResultFile(logDirectoryPath, updateItunesFileName, extensionNameJson, result.executed_at, data);
  }
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

/** コメントコンフリクト修正用ファイルを取得し、コンフリクト解消済か確認する */
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

/** 同期計画を元に iTunes に反映する */
const updateFromSyncPlan = (iTunes: winax.Object, matchedTracks: Array<MatchedTrack>): void => {
  const tracksToUpdate = matchedTracks.filter(matchedTrack => matchedTrack.comment_decision.action === 'update_itunes');
  result.summary.sync_plan_count = tracksToUpdate.length;
  if(tracksToUpdate.length === 0) return console.log(`[${jst()}] 同期計画からの反映対象件数が0件のため、反映作業は発生しませんでした`);
  console.log(`[${jst()}] 同期計画からの反映対象件数 : ${tracksToUpdate.length} 件`);
  
  for(const trackToUpdate of tracksToUpdate) {
    const updateTrackResult: UpdateTrackResult = {
      d1_track_id       : trackToUpdate.d1_track_id,
      persistent_id_high: trackToUpdate.persistent_id_high,
      persistent_id_low : trackToUpdate.persistent_id_low,
      source            : 'sync_plan',
      comment           : trackToUpdate.comment_decision.d1_comment ?? null
    };
    try {
      /** iTunes から楽曲を特定しフルパスを取得する */
      const track = iTunes.LibraryPlaylist.Tracks.ItemByPersistentID(trackToUpdate.persistent_id_high, trackToUpdate.persistent_id_low);
      // MP3 ファイルのコメントを書き換える
      nodeId3.update({ comment: { language: 'eng', text: trackToUpdate.comment_decision.d1_comment ?? '' } }, track.Location);
      // iTunes に反映する
      track.UpdateInfoFromFile();
      
      result.summary.updated_from_sync_plan++;
      result.updated.push(updateTrackResult);
    }
    catch(error) {
      console.error(`[${jst()}] [ERROR] 同期計画からの反映に失敗しました`, error);
      result.errors.push({ ...updateTrackResult, error: `同期計画からの反映に失敗しました : ${serializeError(error)}` });
    }
  }
};

/** コンフリクト情報を元に iTunes に反映する */
const updateFromConflicts = (iTunes: winax.Object, conflictedTracks: Array<ConflictedTrack>): void => {
  const tracksToUpdate = conflictedTracks.filter(conflictedTrack => ['d1', 'manual'].includes(conflictedTrack.resolution.source!));
  result.summary.conflicts_count = tracksToUpdate.length;
  if(tracksToUpdate.length === 0) return console.log(`[${jst()}] コンフリクト情報からの反映対象件数が0件のため、反映作業は発生しませんでした`);
  console.log(`[${jst()}] コンフリクト情報からの反映対象件数 : ${tracksToUpdate.length} 件`);
  
  for(const trackToUpdate of tracksToUpdate) {
    const updateTrackResult: UpdateTrackResult = {
      d1_track_id       : trackToUpdate.d1_track_id,
      persistent_id_high: trackToUpdate.persistent_id_high,
      persistent_id_low : trackToUpdate.persistent_id_low,
      source            : 'conflicts',
      comment           : trackToUpdate.resolution.value ?? null
    };
    try {
      /** iTunes から楽曲を特定しフルパスを取得する */
      const track = iTunes.LibraryPlaylist.Tracks.ItemByPersistentID(trackToUpdate.persistent_id_high, trackToUpdate.persistent_id_low);
      // MP3 ファイルのコメントを書き換える
      nodeId3.update({ comment: { language: 'eng', text: trackToUpdate.resolution.value ?? '' } }, track.Location);
      // iTunes に反映する
      track.UpdateInfoFromFile();
      
      result.summary.updated_from_conflicts++;
      result.updated.push(updateTrackResult);
    }
    catch(error) {
      console.error(`[${jst()}] [ERROR] コンフリクト情報からの反映に失敗しました`, error);
      result.errors.push({ ...updateTrackResult, error: `コンフリクト情報からの反映に失敗しました : ${serializeError(error)}` });
    }
  }
};

/** メイン関数 */
const main = (): void => {
  const iTunes = new winax.Object('iTunes.Application');
  
  const syncPlanResult = loadSyncPlan();
  if(syncPlanResult.error != null) return;
  const commentConflictsResult = loadConflicts();
  if(commentConflictsResult.error != null) return;
  
  // iTunes に反映していく
  updateFromSyncPlan(iTunes, syncPlanResult.result.matched);
  updateFromConflicts(iTunes, commentConflictsResult.result.conflicts);
  
  if(result.errors.length === 0) {
    result.status = 'success';
    console.log(`[${jst()}] 全件正常終了`);
  }
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
