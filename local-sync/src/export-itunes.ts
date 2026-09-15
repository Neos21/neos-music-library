import winax from 'winax';

import { extensionNameJson, itunesTracksFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';
import { ItunesTrack, ItunesTracksResult } from './types/itunes-tracks-result.js';

// --------------------------------------------------
// Export iTunes : iTunes ライブラリ全件を JSON ファイルに出力する
// --------------------------------------------------

console.log(`[${jst()}] Export iTunes : Start`);

const logDirectoryPath = createLogDirectory();

const result: ItunesTracksResult = {
  executed_at: jst(),
  status: 'failed',  // 成功時に `success` に切り替える
  summary: {
    total_tracks: 0,
    itunes_tracks: 0,
    podcast_tracks: 0,
    duplicates: 0,
    warning_tracks: 0,
    error_tracks: 0
  },
  itunes_tracks: [],
  duplicates: [],
  warnings: [],
  errors: []
};

/** ワーニングログを出力しながら結果オブジェクトに追記する */
const warningLog = (message: string): void => {
  console.warn(`[${jst()}] [WARN] ${message}`);
  result.warnings.push({ warning: message });
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
    writeResultFile(logDirectoryPath, itunesTracksFileName, extensionNameJson, result.executed_at, data);
  }
};

/**
 * iTunes から取得した楽曲情報に対して、運用上の不正値を判定する
 * 
 * @returns 運用上の不正値があれば文字列の配列を返す・全項目問題なければ空の配列を返す
 */
const validateItunesTrack = (itunesTrack: ItunesTrack): Array<string> => {
  const warnings = [];
  
  if(itunesTrack.artist == null) warnings.push('アーティスト名が `null` (iTunes 上で空欄) です・iTunes ライブラリの整理を推奨します');
  else if(itunesTrack.artist === '') warnings.push('アーティスト名が空文字です (想定外)');
  else if(itunesTrack.artist !== String(itunesTrack.artist).trim()) warnings.push('アーティスト名の前後に空白文字が混ざっています・iTunes ライブラリの整理を推奨します');
  
  if(itunesTrack.album == null) warnings.push('アルバム名が `null` (iTunes 上で空欄) です・アルバム名がない場合は「■」を明記してください');
  else if(itunesTrack.album === '') warnings.push('アルバム名が空文字です (想定外)');
  else if(itunesTrack.album !== String(itunesTrack.album).trim()) warnings.push('アルバム名の前後に空白文字が混ざっています・iTunes ライブラリの整理を推奨します');
  
  if(itunesTrack.track_number == null) warnings.push('トラック番号は iTunes 上で空欄でも 0 が取得できる想定です・iTunes COM の仕様再確認が必要です (想定外)');
  
  if(itunesTrack.title == null) warnings.push('曲名が `null` です (iTunes 上では空欄にできないため想定外)');
  else if(itunesTrack.title === '') warnings.push('曲名が空文字です (想定外)');
  else if(itunesTrack.title !== String(itunesTrack.title).trim()) warnings.push('曲名の前後に空白文字が混ざっています・iTunes ライブラリの整理を推奨します');
  
  if(itunesTrack.persistent_id_high == null) warnings.push('Persistent ID High が `null` です・取得できていないようです (想定外)');
  
  if(itunesTrack.persistent_id_low == null) warnings.push('Persistent ID Low が `null` です・取得できていないようです (想定外)');
  
  // `imported_comment` は空欄 (`null`) も全然あり得るのでチェックなし
  
  return warnings;
};

/** メイン関数 */
const main = (): void => {
  const iTunes = new winax.Object('iTunes.Application');  // iTunes が起動していなかったら自動的に起動する
  
  const tracks = iTunes.LibraryPlaylist.Tracks;
  result.summary.total_tracks = tracks.Count;
  console.log(`[${jst()}] 総楽曲数 : ${result.summary.total_tracks} 件`);
  
  for(let i = 1; i <= result.summary.total_tracks; i++) {  // Tracks は 1 始まり
    if(i % 1000 === 0) console.log(`[${jst()}] ${i} 件目を処理中…`);  // テキトーに進捗表示
    
    // 1楽曲ごとの情報取得に失敗する場合は起こり得るようなので個別に `try`・`catch` する
    try {
      const track = tracks.Item(i);
      
      // Podcast も含まれる・本アプリでは取り扱わないので除外する
      if(track.Podcast) {
        result.summary.podcast_tracks++;
        continue;
      }
      
      // 先に COM 呼び出し等の処理を済ませる (万が一エラーが発生したら `catch` に落とす)
      const itunesTrack: ItunesTrack = {
        artist            : track.Artist,
        album             : track.Album,
        track_number      : track.TrackNumber,
        title             : track.Name,
        persistent_id_high: iTunes.ITObjectPersistentIDHigh(track),
        persistent_id_low : iTunes.ITObjectPersistentIDLow(track),
        imported_comment  : track.Comment
      };
      const warnings = validateItunesTrack(itunesTrack);
      
      // 処理が正常に終わったら結果を書き込む
      result.itunes_tracks.push(itunesTrack);
      result.summary.itunes_tracks++;
      
      // バリデーションエラーがあったら書き込む
      if(warnings.length > 0) {
        result.warnings.push({ ...itunesTrack, warnings });
        result.summary.warning_tracks++;
      }
    }
    catch(error) {
      // ストリームなど解釈できなかったモノは無視する
      errorLog('楽曲情報取得中のエラー・次の楽曲の処理に移動します', error);
      result.summary.error_tracks++;
    }
  }
  console.log(`[${jst()}] 全件エクスポート完了`);
  
  // アーティスト名・アルバム名・曲名の3つが一致する「重複楽曲」があるかチェックする
  const duplicateMap = new Map<string, Array<ItunesTrack>>();
  for(const itunesTrack of result.itunes_tracks) {
    const key = [itunesTrack.artist || '【アーティスト名なし】', itunesTrack.album || '【アルバム名なし】', itunesTrack.title].join('\t');
    const tracks = duplicateMap.get(key) ?? [];
    tracks.push(itunesTrack);
    duplicateMap.set(key, tracks);
  }
  const duplicates = [...duplicateMap.values()].filter(tracks => tracks.length > 1);
  result.duplicates = duplicates.map(duplicateTracks => ({ count: duplicateTracks.length, tracks: duplicateTracks }));
  result.summary.duplicates = duplicates.length;
  
  console.log(`[${jst()}] 実行結果サマリ :`);
  console.log(`[${jst()}]   総楽曲数                       : ${result.summary.total_tracks}`);
  console.log(`[${jst()}]   エクスポートした楽曲数         : ${result.summary.itunes_tracks}`);
  console.log(`[${jst()}]   Podcast のため除外した数       : ${result.summary.podcast_tracks}`);
  console.log(`[${jst()}]   重複の検出数                   : ${result.summary.duplicates}`);
  console.log(`[${jst()}]   取得時エラーがあった数         : ${result.summary.error_tracks}`);
  console.log(`[${jst()}]   バリデーションエラーがあった数 : ${result.summary.warning_tracks}`);
  
  // エラーではないが確認すべき状態
  if(result.summary.total_tracks === 0 && result.errors.length === 0) {  // iTunes COM 呼び出しは成功しているがライブラリが0件・後続処理をやる意味がない
    warningLog('iTunes ライブラリの総楽曲数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります');
  }
  if(result.summary.itunes_tracks === 0 && result.errors.length === 0) {  // iTunes COM 呼び出しは成功しているがライブラリが0件相当・後続処理をやる意味がない
    warningLog('エクスポートした数が0件でエラーが発生していませんでした・iTunes ライブラリがリセットされているか正しく認識されていない可能性があります');
  }
  
  // iTunes COM の起動時エラーがあれば早期 `return` してあり、この時点では `error_tracks` と `errors.length` が一致しているはずなのでココでチェックする
  if(result.summary.error_tracks !== result.errors.length) {
    errorLog(`取得時エラーがあった楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.error_tracks}・実数 ${result.errors.length}・差異 ${result.summary.error_tracks - result.errors.length}`);
  }
  // 以降は実行結果に基づくエラーメッセージを `result.errors` に追加していく
  
  // エラーとみなして再実行を促したい状態
  if(result.summary.duplicates > 0 || result.duplicates.length > 0) {
    errorLog(`重複判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください`);
  }
  if(result.summary.warning_tracks > 0 || result.warnings.length > 0) {
    errorLog(`Warning 判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください`);
  }
  
  // 実装誤りに起因すると思われる、想定されていない Result の状態不整合もチェックしておき、万が一あったら失敗扱いとする
  const totalCount = result.summary.itunes_tracks + result.summary.podcast_tracks + result.summary.error_tracks;
  if(result.summary.total_tracks !== totalCount) {
    errorLog(`総処理した楽曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Exported + Podcast + Error Tracks ${totalCount}・差異 ${result.summary.total_tracks - totalCount}`);
  }
  if(result.summary.itunes_tracks !== result.itunes_tracks.length) {
    errorLog(`エクスポートした楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.itunes_tracks}・実数 ${result.itunes_tracks.length}・差異 ${result.summary.itunes_tracks - result.itunes_tracks.length}`);
  }
  if(result.summary.duplicates !== result.duplicates.length) {
    errorLog(`重複判定したカウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.duplicates}・実数 ${result.duplicates.length}・差異 ${result.summary.duplicates - result.duplicates.length}`);
  }
  if(result.summary.warning_tracks !== result.warnings.length) {
    errorLog(`バリデーションエラーがあった楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.warning_tracks}・実数 ${result.warnings.length}・差異 ${result.summary.warning_tracks - result.warnings.length}`);
  }
  
  // 最後にステータスを更新する : ココまでで `result.errors` が0件だったら `success` とする
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
    errorLog(`メイン関数で想定外のエラーが発生しました`, error);
    result.status = 'failed';  // 確実に `failed` にしておく
  }
  finally {
    writeResult();
    console.log(`[${jst()}] Export iTunes : Finished`);
  }
})();
