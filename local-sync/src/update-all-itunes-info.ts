import winax from 'winax';

import { jst } from './lib/jst.js';
import { serializeError } from './lib/serialize-error.js';

// --------------------------------------------------
// Update All iTunes Info : iTunes の全楽曲に対して `UpdateInfoFromFile()` を実行する
// --------------------------------------------------

console.log(`[${jst()}] Update All iTunes Info : Start`);

/** 結果オブジェクト */
type UpdateAllItunesInfoResult = {
  /** 実行日時 */
  executed_at: string;
  /** 実行結果 : 成功 (Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** iTunes の全楽曲数 */
    total_tracks: number;
    /** iTunes の反映に成功した楽曲数 */
    updated_tracks: number;
    /** ポッドキャストと判定した楽曲数 */
    podcast_tracks: number;
    /** iTunes の反映でエラーが発生した件数 */
    error_tracks: number;
  };
  /** エラー情報 */
  errors: Array<{ error: string; }>;
};

const result: UpdateAllItunesInfoResult = {
  executed_at: jst(),
  status: 'failed',
  summary: {
    total_tracks: 0,
    updated_tracks: 0,
    podcast_tracks: 0,
    error_tracks: 0
  },
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

/** メイン関数 */
const main = (): void => {
  const iTunes = new winax.Object('iTunes.Application');
  
  const tracks = iTunes.LibraryPlaylist.Tracks;
  result.summary.total_tracks = tracks.Count;
  console.log(`[${jst()}] 総楽曲数 : ${result.summary.total_tracks} 件`);
  
  for(let i = 1; i <= result.summary.total_tracks; i++) {
    if(i % 1000 === 0) console.log(`[${jst()}] ${i} 件目を処理中…`);  // テキトーに進捗表示
    
    const track = tracks.Item(i);
    try {
      track.UpdateInfoFromFile();  // 楽曲情報を更新する
      
      if(track.Podcast) {
        result.summary.podcast_tracks++;
      }
      else {
        result.summary.updated_tracks++;
      }
    }
    catch(error) {
      errorLog('楽曲情報取得中のエラー・次の楽曲の処理に移動します', error);
      result.summary.error_tracks++;
      try {
        console.error(`  エラーになった楽曲情報 : ${i}`);
        console.error(`    Artist   : ${track.Artist}`);
        console.error(`    Album    : ${track.Album}`);
        console.error(`    Name     : ${track.Name}`);
        console.error(`    Podcast  : ${track.Podcast}`);
        console.error(`    Location : ${track.Location}`);
      }
      catch(trackError) {
        console.error('  楽曲情報の表示に失敗しました', trackError);
      }
    }
  }
  console.log(`[${jst()}] 全件更新完了`);
  
  console.log(`[${jst()}] 実行結果サマリ :`);
  console.log(`[${jst()}]   総楽曲数                  : ${result.summary.total_tracks}`);
  console.log(`[${jst()}]   更新した楽曲数            : ${result.summary.updated_tracks}`);
  console.log(`[${jst()}]   Podcast として更新した数  : ${result.summary.podcast_tracks}`);
  console.log(`[${jst()}]   取得時エラーがあった数    : ${result.summary.error_tracks}`);
  
  // iTunes COM の起動時エラーがあれば早期 `return` してあり、この時点では `error_tracks` と `errors.length` が一致しているはずなのでココでチェックする
  if(result.summary.error_tracks !== result.errors.length) {
    errorLog(`取得時エラーがあった楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.error_tracks}・実数 ${result.errors.length}・差異 ${result.summary.error_tracks - result.errors.length}`);
  }
  
  // 実装誤りに起因すると思われる、想定されていない Result の状態不整合もチェックしておき、万が一あったら失敗扱いとする
  const totalCount = result.summary.updated_tracks + result.summary.podcast_tracks + result.summary.error_tracks;
  if(result.summary.total_tracks !== totalCount) {
    errorLog(`総処理した楽曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Updated + Podcast + Error Tracks ${totalCount}・差異 ${result.summary.total_tracks - totalCount}`);
  }
  
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
    result.status = 'failed';
  }
  finally {
    console.log(JSON.stringify(result, null, 2));
    console.log(`[${jst()}] Update All iTunes Info : Finished`);
  }
})();
