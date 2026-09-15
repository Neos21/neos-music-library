import { Result } from '../types/result.js';
import { ConflictsResult } from '../types/sync-plan-result.js';

/** コメントコンフリクト修正用オブジェクトの状態が正常か確認する */
export const validateConflictsResult = (conflictsResult: ConflictsResult): Result<string> => {
  if(conflictsResult.status === 'no_conflicts') {
    const isInvalidSummary   = conflictsResult.summary.conflicts !== 0;
    const isInvalidConflicts = conflictsResult.conflicts.length  !== 0;
    if(isInvalidSummary && isInvalidConflicts) return { error: 'コンフリクトなし `no_conflicts` ですが、サマリ件数と実要素数がともに0件ではありません' };
    if(isInvalidSummary  ) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、サマリ件数が0件ではありません' };
    if(isInvalidConflicts) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、実要素数が0件ではありません' };
    
    // ココまででサマリ件数と実要素数が0件であることは確定しているので、両者のミスマッチがないことは確定しているが、念のためチェックしたのち正常終了とする
    const mismatchSummaryAndConflicts = conflictsResult.summary.conflicts !== conflictsResult.conflicts.length;
    if(mismatchSummaryAndConflicts) return { error: 'コンフリクトなし `no_conflicts` ステータスですが、サマリ件数と実要素数が不一致です (想定外)' };
    
    return { result: 'コンフリクトなし `no_conflicts` ステータス・サマリ件数と実要素数も0件で問題ありません' };
  }
  else if(conflictsResult.status === 'has_conflicts') {
    const isInvalidSummary   = conflictsResult.summary.conflicts === 0;
    const isInvalidConflicts = conflictsResult.conflicts.length  === 0;
    if(isInvalidSummary && isInvalidConflicts) return { error: 'コンフリクトあり `has_conflicts` ですが、サマリ件数と実要素数がともに0件となっています' };
    if(isInvalidSummary  ) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、サマリ件数が0件となっています' };
    if(isInvalidConflicts) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、実要素数が0件となっています' };
    
    const mismatchSummaryAndConflicts = conflictsResult.summary.conflicts !== conflictsResult.conflicts.length;
    if(mismatchSummaryAndConflicts) return { error: 'コンフリクトあり `has_conflicts` ステータスですが、サマリ件数と実要素数が不一致です' };
    
    return { result: 'コンフリクトあり `has_conflicts` ステータス・サマリ件数と実要素数も一致しています・コンフリクトが解消済みか否かは別途チェックしてください' };
  }
  else {
    return { error: `ステータスが想定外の値です : ${conflictsResult.status}`};
  }
};

/** コメントコンフリクト修正用オブジェクトの全体整合性は事前にチェック済の前提として、コンフリクト解消作業が完了しているか否かの部分だけチェックする */
export const isConflictResolutionComplete = (conflictsResult: ConflictsResult): Result<string> => {
  if(conflictsResult.status === 'no_conflicts') return { result: '[NO_CONFCLICTS] ステータスが `no_conflicts` のためコンフリクト解消済とみなします' };
  
  if(conflictsResult.conflicts.length === 0) return { result: '[CONFLICTS_LENGTH_ZERO] `conflicts` は空配列です・コンフリクトはありません' };
  
  for(const conflict of conflictsResult.conflicts) {
    const source = conflict.resolution.source;
    if(source == null) return { error: '[NG] [INCOMPLETED] `source` が `null` の未解消楽曲が残っています' };
    if(!['d1', 'itunes', 'manual'].includes(source)) return { error: `[INVALID_SOURCE] \`source\` に想定外の値が設定された楽曲があります : ${source}` };
    
    const value = conflict.resolution.value;
    if(value !== null && typeof value !== 'string') return { error: `[INVALID_VALUE_TYPE] \`value\` に \`null\`・文字列以外の値が設定された楽曲があります : ${typeof value}` };
  }
  
  return { result: '[COMPLETED] `conflicts` に1件以上の楽曲があり、全てがコンフリクト解消済でした' };
};
