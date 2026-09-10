import winax from 'winax';

import { extensionNameJson, rawItunesTracksFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { getJst } from './lib/get-jst.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';

import type { RawItunesTrack } from './types/raw-itunes-track.js';
import type { RawItunesTracksJson } from './types/raw-itunes-tracks-json.js';

// --------------------------------------------------
// Export iTunes Library : iTunes ライブラリ全件を JSON ファイルに出力する
// --------------------------------------------------

console.log(`[${getJst()}] Export iTunes Library : Start`);

const logDirectoryPath = createLogDirectory();

const result: RawItunesTracksJson = {
  executed_at: getJst(),
  status: 'failed',  // 成功時に `success` に切り替える
  summary: {
    total_tracks: 0,
    exported_tracks: 0,
    podcast_tracks: 0,
    duplicates: 0,
    warning_tracks: 0,
    error_tracks: 0
  },
  raw_itunes_tracks: [],
  duplicates: [],
  warnings: [],
  errors: []
};

/** 結果ファイルを出力して終了メッセージを表示する */
const writeResult = (): void => {
  let data;
  try {
    data = JSON.stringify(result, null, 2) + '\n';
  }
  catch(error) {
    console.error(`[${getJst()}] [ERROR] 結果オブジェクトの JSON 文字列化に失敗しました・結果ファイルが出力できません`, error);
  }
  if(data != null) {
    writeResultFile(logDirectoryPath, rawItunesTracksFileName, extensionNameJson, result.executed_at, data);
  }
  
  console.log(`[${getJst()}] Export iTunes Library : Finished`);
};

/**
 * iTunes から取得した楽曲情報に対して、運用上の不正値を判定する
 * 
 * @returns 運用上の不正値があれば文字列の配列を返す・全項目問題なければ空の配列を返す
 */
const validateItunesTrack = (rawItunesTrack: RawItunesTrack): Array<string> => {
  const warnings = [];
  
  if(rawItunesTrack.artist == null) warnings.push('アーティスト名が null (iTunes 上で空欄) です');
  else if(rawItunesTrack.artist === '') warnings.push('アーティスト名が空文字です (想定外)');
  else if(rawItunesTrack.artist !== String(rawItunesTrack.artist).trim()) warnings.push('アーティスト名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.album == null) warnings.push('アルバム名が null (iTunes 上で空欄) です・アルバム名がない場合は「■」を明記してください');
  else if(rawItunesTrack.album === '') warnings.push('アルバム名が空文字です (想定外)');
  else if(rawItunesTrack.album !== String(rawItunesTrack.album).trim()) warnings.push('アルバム名の前後に空白文字が混ざっています');
  
  // `track_number` は空欄時 `0` で出力され `null` になることはないのでチェックなし
  
  if(rawItunesTrack.title == null) warnings.push('曲名が null です (iTunes 上では空欄にできないため想定外)');
  else if(rawItunesTrack.title === '') warnings.push('曲名が空文字です (想定外)');
  else if(rawItunesTrack.title !== String(rawItunesTrack.title).trim()) warnings.push('曲名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.persistent_id_high == null) warnings.push('Persistent ID High が null です・取得できていないようです (想定外)');
  
  if(rawItunesTrack.persistent_id_low == null) warnings.push('Persistent ID Low が null です・取得できていないようです (想定外)');
  
  // `imported_comment` は空欄 (`null`) も全然あり得るのでチェックなし
  
  return warnings;
};

// 早期 Return したいので即時関数でラップする
(() => {
  let iTunes;
  let tracks;
  try {
    iTunes = new winax.Object('iTunes.Application');  // iTunes が起動していなかったら自動的に起動する
    tracks = iTunes.LibraryPlaylist.Tracks;
    result.summary.total_tracks = tracks.Count;
    console.log(`[${getJst()}] 総トラック数 : ${result.summary.total_tracks} 件`);
  }
  catch(error) {
    console.error(`[${getJst()}] [ERROR] iTunes COM の呼び出しでエラー発生`, error);
    result.errors.push({ error: `iTunes COM の呼び出しでエラー発生 : ${serializeError(error)}` });
    return writeResult();
  }
  
  for(let i = 1; i <= result.summary.total_tracks; i++) {  // Tracks は 1 始まり
    if(i % 1000 === 0) console.log(`[${getJst()}] ${i} 件目を処理中…`);  // テキトーに進捗表示
    
    // 1曲ごとの情報取得に失敗する場合は起こり得るようなので個別に `try`・`catch` する
    try {
      const trackItem = tracks.Item(i);
      
      // Podcast もトラックとして含まれる・本アプリでは取り扱わないので除外する
      if(trackItem.Podcast) {
        result.summary.podcast_tracks++;
        continue;
      }
      
      // 先に COM 呼び出し等の処理を済ませる (万が一エラーが発生したら `catch` に落とす)
      const rawItunesTrack: RawItunesTrack = {
        artist            : trackItem.Artist,
        album             : trackItem.Album,
        track_number      : trackItem.TrackNumber,
        title             : trackItem.Name,
        persistent_id_high: iTunes.ITObjectPersistentIDHigh(trackItem),
        persistent_id_low : iTunes.ITObjectPersistentIDLow(trackItem),
        imported_comment  : trackItem.Comment
      };
      const warnings = validateItunesTrack(rawItunesTrack);
      
      // 処理が正常に終わったら結果を書き込む
      result.raw_itunes_tracks.push(rawItunesTrack);
      result.summary.exported_tracks++;
      
      // バリデーションエラーがあったら書き込む
      if(warnings.length > 0) {
        result.warnings.push({ ...rawItunesTrack, warnings });
        result.summary.warning_tracks++;
      }
    }
    catch(error) {
      // ストリームなど解釈できなかったモノは無視する
      console.error(`[${getJst()}] [ERROR] トラック情報取得中のエラー・次のトラック処理に移動します`, error);
      result.errors.push({ error: `トラック情報処理中のエラー : ${serializeError(error)}` });
      result.summary.error_tracks++;
    }
  }
  console.log(`[${getJst()}] 全件エクスポート完了`);
  
  // アーティスト名・アルバム名・曲名の3つが一致する「重複曲」があるかチェックする
  const duplicateMap = new Map<string, Array<RawItunesTrack>>();
  for(const track of result.raw_itunes_tracks) {
    const key = [track.artist || '【アーティスト名なし】', track.album || '【アルバム名なし】', track.title].join('\t');
    const tracks = duplicateMap.get(key) ?? [];
    tracks.push(track);
    duplicateMap.set(key, tracks);
  }
  const duplicates = [...duplicateMap.values()].filter(tracks => tracks.length > 1);
  result.duplicates = duplicates.map(duplicateTracks => ({ count: duplicateTracks.length, tracks: duplicateTracks }));
  result.summary.duplicates = duplicates.length;
  
  console.log(`[${getJst()}] 実行結果サマリ :`);
  console.log(`[${getJst()}]   総トラック数                   : ${result.summary.total_tracks}`);
  console.log(`[${getJst()}]   エクスポートした数             : ${result.summary.exported_tracks}`);
  console.log(`[${getJst()}]   Podcast のため除外した数       : ${result.summary.podcast_tracks}`);
  console.log(`[${getJst()}]   重複の検出数                   : ${result.summary.duplicates}`);
  console.log(`[${getJst()}]   取得時エラーがあった数         : ${result.summary.error_tracks}`);
  console.log(`[${getJst()}]   バリデーションエラーがあった数 : ${result.summary.warning_tracks}`);
  
  // エラーではないが確認すべき状態
  if(result.summary.total_tracks === 0 && result.errors.length === 0) {  // 総トラック数が0件なのにエラーなしの場合 : iTunes COM 呼び出しは成功しているがライブラリが0件・後続処理をやる意味がない
    console.warn(`[${getJst()}] [WARN] iTunes ライブラリの総トラック数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります`);
    result.warnings.push({ warning: 'iTunes ライブラリの総トラック数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります' });
  }
  if(result.summary.exported_tracks === 0 && result.errors.length === 0) {  // エクスポートした数が0件なのにエラーなしの場合 : iTunes COM 呼び出しは成功しているがライブラリが0件相当・後続処理をやる意味がない
    console.warn(`[${getJst()}] [WARN] エクスポートした数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります`);
    result.warnings.push({ warning: 'エクスポートした数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります' });
  }
  
  // iTunes COM の起動時エラーがあれば早期 Return してあり、この時点では `error_tracks` と `errors.length` が一致しているはずなのでココでチェックする
  if(result.summary.error_tracks !== result.errors.length) {
    console.error(`[${getJst()}] [ERROR] 取得時エラーがあった曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.error_tracks}・実数 ${result.errors.length}・差異 ${result.summary.error_tracks - result.errors.length}`);
    result.errors.push({ error: `取得時エラーがあった曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.error_tracks}・実数 ${result.errors.length}・差異 ${result.summary.error_tracks - result.errors.length}` });
  }
  // 以降は実行結果をに基づくエラーメッセージを `result.errors` に追加していく
  
  // エラーとみなして再実行を促したい状態
  if(result.summary.duplicates > 0 || result.duplicates.length > 0) {
    console.error(`[${getJst()}] [ERROR] 重複判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください`);
    result.errors.push({ error: '重複判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください' });
  }
  if(result.summary.warning_tracks > 0 || result.warnings.length > 0) {
    console.error(`[${getJst()}] [ERROR] Warning 判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください`);
    result.errors.push({ error: 'Warning 判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください' });
  }
  
  // 実装誤りに起因すると思われる、想定されていない Result の状態不整合もチェックしておき、万が一あったら失敗扱いとする
  const totalCount = result.summary.exported_tracks + result.summary.podcast_tracks + result.summary.error_tracks;
  if(result.summary.total_tracks !== totalCount) {
    console.error(`[${getJst()}] [ERROR] 総処理した曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Exported + Podcast + Error Tracks ${totalCount}・差異 ${result.summary.total_tracks - totalCount}`);
    result.errors.push({ error: `総処理した曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Exported + Podcast + Error Tracks ${totalCount}・差異 ${result.summary.total_tracks - totalCount}` });
  }
  if(result.summary.exported_tracks !== result.raw_itunes_tracks.length) {
    console.error(`[${getJst()}] [ERROR] エクスポートした曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.exported_tracks}・実数 ${result.raw_itunes_tracks.length}・差異 ${result.summary.exported_tracks - result.raw_itunes_tracks.length}`);
    result.errors.push({ error: `エクスポートした曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.exported_tracks}・実数 ${result.raw_itunes_tracks.length}・差異 ${result.summary.exported_tracks - result.raw_itunes_tracks.length}` });
  }
  if(result.summary.duplicates !== result.duplicates.length) {
    console.warn(`[${getJst()}] [ERROR] 重複判定したカウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.duplicates}・実数 ${result.duplicates.length}・差異 ${result.summary.duplicates - result.duplicates.length}`);
    result.errors.push({ error: `重複判定したカウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.duplicates}・実数 ${result.duplicates.length}・差異 ${result.summary.duplicates - result.duplicates.length}` });
  }
  if(result.summary.warning_tracks !== result.warnings.length) {
    console.error(`[${getJst()}] [ERROR] バリデーションエラーがあった曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.warning_tracks}・実数 ${result.warnings.length}・差異 ${result.summary.warning_tracks - result.warnings.length}`);
    result.errors.push({ error: `バリデーションエラーがあった曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.warning_tracks}・実数 ${result.warnings.length}・差異 ${result.summary.warning_tracks - result.warnings.length}` });
  }
  
  // 最後にステータスを更新する : ココまでで `result.errors` が0件だったら `success` とする
  if(result.errors.length === 0) {
    result.status = 'success';
    console.log(`[${getJst()}] 全件正常終了`);
  }
  
  writeResult();
})();
