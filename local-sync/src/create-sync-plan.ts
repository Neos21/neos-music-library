import fs from 'node:fs';
import path from 'node:path';

import { commentConflictsFileName, d1TracksFileName, extensionNameJson, itunesTracksFileName, syncPlanFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';
import { validateCommentConflictsResult } from './lib/validate-comment-conflicts-result.js';
import { writeResultFile } from './lib/write-result-file.js';
import { D1Track } from './schemas/d1-track.js';
import { D1TracksResult } from './types/d1-tracks-result.js';
import { ItunesTrack } from './types/itunes-track.js';
import { ItunesTracksResult } from './types/itunes-tracks-result.js';
import { Result } from './types/result.js';
import { CommentConflictsResult, CommentDecision, MetadataDecision, SyncPlanResult } from './types/sync-plan-result.js';

// --------------------------------------------------
// Create Sync Plan : iTunes と D1 を突合して同期計画を組み立てる
// --------------------------------------------------

console.log(`[${jst()}] Create Sync Plan : Start`);

const logDirectoryPath = createLogDirectory();

const jstNow = jst();

const result: SyncPlanResult = {
  executed_at: jstNow,
  status: 'failed',
  summary: {
    source_counts: {
      itunes_tracks: 0,
      d1_tracks: 0
    },
    reconciliation: {
      inserts: 0,
      deletes: 0,
      matched: 0
    },
    matched_tracks: {
      fully_unchanged: 0,
      
      metadata_unchanged: 0,
      metadata_update_d1: 0,
      
      comment_unchanged: 0,
      comment_update_itunes: 0,
      comment_update_d1: 0,
      comment_conflicts: 0
    },
    operations: {
      insert_d1: 0,
      delete_d1: 0,
      update_metadata_d1: 0,
      update_comment_itunes: 0,
      update_comment_d1: 0
    }
  },
  inserts: [],
  deletes: [],
  matched: [],
  errors: []
};

const commentConflictsResult: CommentConflictsResult = {
  executed_at: jstNow,
  status: 'no_conflicts',
  summary: {
    conflicts: 0
  },
  conflicts: []
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
    writeResultFile(logDirectoryPath, syncPlanFileName, extensionNameJson, result.executed_at, data);
  }
  
  let commentConflictsResultData;
  try {
    commentConflictsResultData = JSON.stringify(commentConflictsResult, null, 2) + '\n';
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] コメントコンフリクト修正用オブジェクトの JSON 文字列化に失敗しました・コメントコンフリクト修正用ファイルが出力できません`, error);
  }
  if(commentConflictsResultData != null) {
    writeResultFile(logDirectoryPath, commentConflictsFileName, extensionNameJson, commentConflictsResult.executed_at, commentConflictsResultData);
  }
};

/** Persistent ID を結合して Map 用のキー文字列を作る */
const createPersistentIdKey = (persistentIdHigh: number, persistentIdLow: number): string => `${persistentIdHigh}:${persistentIdLow}`;

/** iTunes ライブラリ情報ファイルを取得して Persistent ID をキーにした Map で返す */
const loadItunesTracks = (): Result<Map<string, ItunesTrack>> => {
  try {
    const text = fs.readFileSync(path.resolve(logDirectoryPath, itunesTracksFileName + extensionNameJson), 'utf-8');
    const json: ItunesTracksResult = JSON.parse(text);
    
    // 最低限の続行不可能なエラーがないことをチェックする
    if(json.status === 'failed') {
      errorLog('iTunes ライブラリ情報のファイルが `failed` 状態でした・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load iTunes Tracks' };
    }
    if(json.errors.length > 0) {
      errorLog('iTunes ライブラリ情報のファイルに `errors` が出力されていました・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load iTunes Tracks' };
    }
    
    const itunesTracks = new Map(json.itunes_tracks.map(itunesTrack => [createPersistentIdKey(itunesTrack.persistent_id_high, itunesTrack.persistent_id_low), itunesTrack]));
    if(json.itunes_tracks.length !== itunesTracks.size) {
      errorLog('iTunes ライブラリ情報のファイルに Persistent ID が重複している項目が出力されているようです・データ不整合の可能性があります・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load iTunes Tracks' };
    }
    
    return { result: itunesTracks };
  }
  catch(error) {
    errorLog('iTunes ライブラリ情報のファイルを読み込めませんでした', error);
    return { error: 'Failed To Load iTunes Tracks' };
  }
};

/** D1 楽曲情報ファイルを取得して Persistent ID をキーにした Map で返す */
const loadD1Tracks = (): Result<Map<string, D1Track>> => {
  try {
    const text = fs.readFileSync(path.resolve(logDirectoryPath, d1TracksFileName + extensionNameJson), 'utf-8');
    const json: D1TracksResult = JSON.parse(text);
    
    // 最低限の続行不可能なエラーがないことをチェックする
    if(json.status === 'failed') {
      errorLog('D1 楽曲情報のファイルが `failed` 状態でした・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load D1 Tracks' };
    }
    if(json.errors.length > 0) {
      errorLog('D1 楽曲情報のファイルに `errors` が出力されていました・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load D1 Tracks' };
    }
    if(json.invalid_tracks.length > 0) {
      errorLog('D1 楽曲情報のファイルに `invalid_tracks` が出力されていました・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load D1 Tracks' };
    }
    
    const d1Tracks = new Map(json.valid_tracks.map(d1Track => [createPersistentIdKey(d1Track.persistent_id_high, d1Track.persistent_id_low), d1Track]));
    if(json.valid_tracks.length !== d1Tracks.size) {
      errorLog('D1 楽曲情報のファイルに Persistent ID が重複している項目が出力されているようです・データ不整合の可能性があります・続行不可能と判断し処理を中断します');
      return { error: 'Failed To Load D1 Tracks' };
    }
    
    return { result: d1Tracks };
  }
  catch(error) {
    errorLog('D1 楽曲情報のファイルを読み込めませんでした', error);
    return { error: 'Failed To Load D1 Tracks' };
  }
};

/** D1 の Persistent ID をキーに iTunes 側を走査 → iTunes 側に該当する Persistent ID がない楽曲は `deletes` に追加する */
const detectDeletes = (d1Tracks: Map<string, D1Track>, itunesTracks: Map<string, ItunesTrack>): void => {
  for(const [persistentIdKey, d1Track] of d1Tracks) {
    const itunesTrack = itunesTracks.get(persistentIdKey);
    if(itunesTrack == null) result.deletes.push(d1Track);
  }
};

/** メタデータの差分情報を組み立てる */
const createMetadataDecision = (itunesTrack: ItunesTrack, d1Track: D1Track): MetadataDecision => {
  const changes: Record<string, string | number | null> = {};
  if(itunesTrack.album        !== d1Track.album       ) changes['album'       ] = itunesTrack.album;
  if(itunesTrack.artist       !== d1Track.artist      ) changes['artist'      ] = itunesTrack.artist;
  if(itunesTrack.track_number !== d1Track.track_number) changes['track_number'] = itunesTrack.track_number;
  if(itunesTrack.title        !== d1Track.title       ) changes['title'       ] = itunesTrack.title;
  
  if(Object.keys(changes).length === 0) {
    return { action: 'unchanged' };
  }
  else {
    return { action: 'update_d1', changes: changes };
  }
};

/** コメントの差分情報を組み立てる */
const createCommentDecision = (itunesTrack: ItunesTrack, d1Track: D1Track): CommentDecision => {
  /** D1 より取得した旧 iTunes のコメント */
  const importedComment = d1Track.imported_comment;
  /** D1 より取得したコメント */
  const d1Comment       = d1Track.comment;
  /** iTunes ライブラリより取得した現在のコメント */
  const itunesComment   = itunesTrack.imported_comment;
  
  // 差分なし
  if(importedComment === d1Comment && d1Comment === itunesComment) return { action: 'unchanged' };
  
  // D1 の `comment` のみ変更を確認 → iTunes への反映と D1 の `imported_comment` の UPDATE が必要
  if(importedComment === itunesComment && importedComment !== d1Comment) return {
    action          : 'update_itunes',
    imported_comment: importedComment,
    d1_comment     : d1Comment,
    itunes_comment  : itunesComment
  };
  
  // iTunes のみ変更を確認 → D1 への UPDATE が必要
  if(importedComment === d1Comment && importedComment !== itunesComment) return {
    action          : 'update_d1',
    imported_comment: importedComment,
    d1_comment      : d1Comment,
    itunes_comment  : itunesComment
  };
  
  // D1 の `comment` と iTunes の変更があったが同値だった → D1 の `imported_comment` への UPDATE が必要
  if(d1Comment === itunesComment && importedComment !== d1Comment) return {
    action          : 'update_d1',
    imported_comment: importedComment,
    d1_comment      : d1Comment,
    itunes_comment  : itunesComment
  };
  
  // D1 と iTunes の変更があり3つが異なる値だった → コンフリクト・自動解決できないため人間の判断に委ねる
  if(importedComment !== d1Comment && d1Comment !== itunesComment && importedComment !== itunesComment) return {
    action          : 'conflict',
    imported_comment: importedComment,
    d1_comment      : d1Comment,
    itunes_comment  : itunesComment
  };
  
  // ココまでで全パターンチェックできているはずなので、ココに到達したら実装誤り
  const report = {
    d1_track_id       : d1Track.id,
    persistent_id_high: itunesTrack.persistent_id_high,
    persistent_id_low : itunesTrack.persistent_id_low,
    imported_comment  : importedComment,
    d1_comment        : d1Comment,
    itunes_comment    : itunesComment
  };
  const errorMessage = `\`createCommentDecision\` で想定外の組み合わせが発生しました・実装誤りの恐れがあります : ${JSON.stringify(report)}`;
  errorLog(errorMessage);
  throw new Error(errorMessage);
};

/** iTunes の Persistent ID をキーに D1 側を走査 → D1 側に該当する Persistent ID がない楽曲は `inserts` に追加する・合致する楽曲は差分を確認しながら `matched` に追加する */
const detectInsertsAndMatched = (itunesTracks: Map<string, ItunesTrack>, d1Tracks: Map<string, D1Track>): void => {
  for(const [persistentIdKey, itunesTrack] of itunesTracks) {
    const d1Track = d1Tracks.get(persistentIdKey);
    
    // `inserts` 対象
    if(d1Track == null) {
      result.inserts.push(itunesTrack);
      continue;
    }
    
    // `matched` 対象・差分を確認して格納していく
    const metadataDecision = createMetadataDecision(itunesTrack, d1Track);
    const commentDecision = createCommentDecision(itunesTrack, d1Track);  // 条件分岐に実装誤りがあった場合はエラーを `throw` する
    result.matched.push({
      d1_track_id       : d1Track.id,
      persistent_id_high: itunesTrack.persistent_id_high,
      persistent_id_low : itunesTrack.persistent_id_low,
      metadata_decision : metadataDecision,
      comment_decision  : commentDecision
    });
  }
};

/** メイン関数 */
const main = (): void => {
  // ファイルを読み込む
  const itunesTracksResult = loadItunesTracks();
  if(itunesTracksResult.error != null) return;
  const itunesTracks = itunesTracksResult.result;
  
  const d1TracksResult = loadD1Tracks();
  if(d1TracksResult.error != null) return;
  const d1Tracks = d1TracksResult.result;
  
  // 差分を集計する
  detectDeletes(d1Tracks, itunesTracks);
  detectInsertsAndMatched(itunesTracks, d1Tracks);  // 条件分岐に実装誤りがあった場合はエラーを `throw` する
  
  // サマリを集計する
  const conflicts = result.matched.filter(matched => matched.comment_decision.action === 'conflict');
  result.summary.source_counts.itunes_tracks = itunesTracks.size;
  result.summary.source_counts.d1_tracks     = d1Tracks.size;
  result.summary.reconciliation.inserts = result.inserts.length;
  result.summary.reconciliation.deletes = result.deletes.length;
  result.summary.reconciliation.matched = result.matched.length;
  result.summary.matched_tracks.fully_unchanged       = result.matched.filter(matched => matched.metadata_decision.action === 'unchanged' && matched.comment_decision.action === 'unchanged').length;
  result.summary.matched_tracks.metadata_unchanged    = result.matched.filter(matched => matched.metadata_decision.action === 'unchanged').length;
  result.summary.matched_tracks.metadata_update_d1    = result.matched.filter(matched => matched.metadata_decision.action === 'update_d1').length;
  result.summary.matched_tracks.comment_unchanged     = result.matched.filter(matched => matched.comment_decision.action === 'unchanged').length;
  result.summary.matched_tracks.comment_update_itunes = result.matched.filter(matched => matched.comment_decision.action === 'update_itunes').length;
  result.summary.matched_tracks.comment_update_d1     = result.matched.filter(matched => matched.comment_decision.action === 'update_d1').length;
  result.summary.matched_tracks.comment_conflicts     = conflicts.length;
  result.summary.operations.insert_d1                  = result.summary.reconciliation.inserts;
  result.summary.operations.delete_d1                  = result.summary.reconciliation.deletes;
  result.summary.operations.update_metadata_d1         = result.summary.matched_tracks.metadata_update_d1;
  result.summary.operations.update_comment_itunes      = result.summary.matched_tracks.comment_update_itunes;
  result.summary.operations.update_comment_d1          = result.summary.matched_tracks.comment_update_d1;
  
  // コメントコンフリクト修正用情報を書き出す
  commentConflictsResult.status            = conflicts.length === 0 ? 'no_conflicts' : 'has_conflicts';
  commentConflictsResult.summary.conflicts = conflicts.length;
  commentConflictsResult.conflicts         = conflicts.map(conflict => ({
    d1_track_id       : conflict.d1_track_id,
    persistent_id_high: conflict.persistent_id_high,
    persistent_id_low : conflict.persistent_id_low,
    imported_comment  : conflict.comment_decision.imported_comment!,
    d1_comment        : conflict.comment_decision.d1_comment!,
    itunes_comment    : conflict.comment_decision.itunes_comment!,
    resolution        : {
      value : null,
      source: null
    }
  }));
  
  console.log(`[${jst()}] 実行結果サマリ :`);
  console.log(`[${jst()}]   iTunes 総楽曲数                 : ${result.summary.source_counts.itunes_tracks}`);
  console.log(`[${jst()}]   D1 総楽曲数                     : ${result.summary.source_counts.d1_tracks}`);
  console.log(`[${jst()}]   差分なしの楽曲数                : ${result.summary.matched_tracks.fully_unchanged}`);
  console.log(`[${jst()}]   D1 への INSERT 対象数           : ${result.summary.operations.insert_d1}`);
  console.log(`[${jst()}]   D1 への DELETE 対象数           : ${result.summary.operations.delete_d1}`);
  console.log(`[${jst()}]   D1 へのメタデータ UPDATE 対象数 : ${result.summary.operations.update_metadata_d1}`);
  console.log(`[${jst()}]   iTunes へのコメント反映対象数   : ${result.summary.operations.update_comment_itunes}`);
  console.log(`[${jst()}]   D1 へのコメント UPDATE 対象数   : ${result.summary.operations.update_comment_d1}`);
  console.log(`[${jst()}]   コメントのコンフリクト数        : ${commentConflictsResult.summary.conflicts}`);
  
  // 件数の不一致がないかチェックする
  if(result.summary.source_counts.itunes_tracks !== result.summary.reconciliation.inserts + result.summary.reconciliation.matched) errorLog('iTunes ライブラリの総楽曲件数と差分チェック結果件数が不一致です');
  if(result.summary.source_counts.d1_tracks     !== result.summary.reconciliation.deletes + result.summary.reconciliation.matched) errorLog('D1 の総楽曲件数と差分チェック結果件数が不一致です');
  if(result.summary.reconciliation.matched !== result.summary.matched_tracks.metadata_unchanged + result.summary.matched_tracks.metadata_update_d1) errorLog('マッチした楽曲件数とメタデータの差分チェック結果件数が不一致です');
  const commentTracks = result.summary.matched_tracks.comment_unchanged
                      + result.summary.matched_tracks.comment_update_itunes
                      + result.summary.matched_tracks.comment_update_d1
                      + result.summary.matched_tracks.comment_conflicts;
  if(result.summary.reconciliation.matched !== commentTracks) errorLog('マッチした楽曲件数とコメントの差分チェック結果件数が不一致です');
  
  // Persistent ID をチェックして想定外の重複が発生していないかチェックする
  const persistentIdMatched = result.matched.map(track => createPersistentIdKey(track.persistent_id_high, track.persistent_id_low));
  const itunesPersistentIds = [...result.inserts.map(track => createPersistentIdKey(track.persistent_id_high, track.persistent_id_low)), ...persistentIdMatched];
  const d1PersistentIds     = [...result.deletes.map(track => createPersistentIdKey(track.persistent_id_high, track.persistent_id_low)), ...persistentIdMatched];
  if(new Set(itunesPersistentIds).size !== itunesPersistentIds.length) errorLog('INSERT 対象とマッチした楽曲の中に Persistent ID が重複している楽曲があります・iTunes ライブラリ情報に不整合がある恐れがあります');
  if(new Set(d1PersistentIds    ).size !== d1PersistentIds.length    ) errorLog('DELETE 対象とマッチした楽曲の中に Persistent ID が重複している楽曲があります・D1 情報に不整合がある恐れがあります');
  
  // D1 のトラック ID をチェックして想定外の重複が発生していないかチェックする
  const d1TrackIds = [...result.deletes.map(track => track.id), ...result.matched.map(track => track.d1_track_id)];
  if(new Set(d1TrackIds).size !== d1TrackIds.length) errorLog('DELETE 対象とマッチした楽曲の中に D1 トラック ID が重複している楽曲があります・実装誤りの恐れがあります');
  
  // コメントコンフリクト修正用オブジェクトの状態不整合をチェックする
  const validationResultcommentConflictsResult = validateCommentConflictsResult(commentConflictsResult);
  if(validationResultcommentConflictsResult.error != null) errorLog(validationResultcommentConflictsResult.error);
  
  // 最後にステータスを更新する
  if(result.errors.length === 0) {
    result.status = 'success';
    console.log(`[${jst()}] 正常終了`);
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
    console.log(`[${jst()}] Create Sync Plan : Finished`);
  }
})();
