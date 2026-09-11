import { Result } from '../types/result.js';
import { CommentConflictsResult } from '../types/sync-plan-result.js';

/** コメントコンフリクト修正用オブジェクトの状態が正常か確認する */
export const validateCommentConflictsResult = (commentConflictsResult: CommentConflictsResult): Result<string> => {
  if(commentConflictsResult.status === 'no_conflicts') {
    const invalidSummary   = commentConflictsResult.summary.conflicts !== 0;
    const invalidConflicts = commentConflictsResult.conflicts.length  !== 0;
    if(invalidSummary && invalidConflicts) return { error: 'コンフリクトなし `no_conflicts` ですが、サマリ件数と実要素数がともに0件ではありません' };
    if(invalidSummary  ) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、サマリ件数が0件ではありません' };
    if(invalidConflicts) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、実要素数が0件ではありません' };
    
    // ココまででサマリ件数と実要素数が0件であることは確定しているので、両者のミスマッチがないことは確定しているが、念のためチェックしたのち正常終了とする
    const mismatchSummaryAndConflicts = commentConflictsResult.summary.conflicts !== commentConflictsResult.conflicts.length;
    if(mismatchSummaryAndConflicts) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、サマリ件数と実要素数が不一致です (想定外)' };
    
    return { result: 'コンフリクトなし `no_conflicts` ステータス・サマリ件数と実要素数も0件で問題ありません' };
  }
  else if(commentConflictsResult.status === 'has_conflicts') {
    const invalidSummary   = commentConflictsResult.summary.conflicts === 0;
    const invalidConflicts = commentConflictsResult.conflicts.length  === 0;
    if(invalidSummary && invalidConflicts) return { error: 'コンフリクトあり `has_conflicts` ですが、サマリ件数と実要素数がともに0件となっています' };
    if(invalidSummary  ) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、サマリ件数が0件となっています' };
    if(invalidConflicts) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、実要素数が0件となっています' };
    
    const mismatchSummaryAndConflicts = commentConflictsResult.summary.conflicts !== commentConflictsResult.conflicts.length;
    if(mismatchSummaryAndConflicts) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、サマリ件数と実要素数が不一致です' };
    
    return { result: 'コンフリクトあり `has_conflicts` ステータス・サマリ件数と実要素数も一致しています・コンフリクトが解消済みか否かは別途チェックしてください' };
  }
  else {
    return { error: `ステータスが想定外の値です : ${commentConflictsResult.status}`};
  }
};

/** コメントコンフリクト修正用オブジェクトの全体整合性は事前にチェック済の前提として、コンフリクト解消作業が完了しているか否かの部分だけチェックする */
export const isConflictResolutionComplete = (commentConflictsResult: CommentConflictsResult): Result<string> => {
  if(commentConflictsResult.status === 'no_conflicts') return { error: '[NO_CONFCLICTS] ステータスが `no_conflicts` のためチェックをスキップしました' };
  
  if(commentConflictsResult.conflicts.length === 0) return { result: '[CONFLICTS_LENGTH_ZERO] `conflicts` は空配列です・コンフリクトはありません' };
  
  for(const conflict of commentConflictsResult.conflicts) {
    const source = conflict.resolution.source;
    if(source == null) return { error: '[NG] [INCOMPLETED] `source` が `null` の未解消データが残っています' };
    if(!['d1', 'itunes', 'manual'].includes(source)) return { error: `[INVALID_SOURCE] \`source\` に想定外の値が設定されたデータがあります : ${source}` };
    
    const value = conflict.resolution.value;
    if(value !== null && typeof value !== 'string') return { error: `[INVALID_VALUE_TYPE] \`value\` に \`null\`・文字列以外の値が設定されたデータがあります : ${typeof value}` };
  }
  
  return { result: '[COMPLETED] `conflicts` に1件以上のデータがあり、全てがコンフリクト解消済でした' };
};
