import Cloudflare from 'cloudflare';
import process from 'node:process';

import { cloudflareAccountId, d1DatabaseId, d1TracksFileName, extensionNameJson } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';
import { mergeZodIssues } from './lib/merge-zod-issues.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';
import { D1Track, d1TrackSchema } from './schemas/d1-track.js';
import { D1TracksResult } from './types/d1-tracks-result.js';
import { Result } from './types/result.js';

// --------------------------------------------------
// Load D1 Tracks : D1 から `tracks` テーブルを全件取得して JSON ファイルに出力する
// --------------------------------------------------

console.log(`[${jst()}] Load D1 Tracks : Start`);

const logDirectoryPath = createLogDirectory();

const result: D1TracksResult = {
  executed_at: jst(),
  status: 'failed',
  summary: {
    total_tracks: 0,
    valid_tracks: 0,
    invalid_tracks: 0
  },
  valid_tracks: [],
  invalid_tracks: [],
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
    data = JSON.stringify(result, null, 2) + '\n';
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] 結果オブジェクトの JSON 文字列化に失敗しました・結果ファイルが出力できません`, error);
  }
  if(data != null) {
    writeResultFile(logDirectoryPath, d1TracksFileName, extensionNameJson, result.executed_at, data);
  }
};

/** D1 から全楽曲を取得する */
const loadD1Tracks = async (d1ApiToken: string): Promise<Result<Array<D1Track>>> => {
  try {
    const client = new Cloudflare({ apiToken: d1ApiToken });
    const queryResult = await client.d1.database.query(d1DatabaseId, {
      account_id: cloudflareAccountId,
      sql: 'SELECT * FROM tracks'
    });
    
    // 実行結果の不正が分かれば早期 `return` → `finally` で結果ファイルを出力して終了する
    if(queryResult?.result[0]?.success == null) {
      errorLog('D1 API の `success` レスポンスが `null` または `undefined` でした');
      return { error: 'Failed To Load D1 Tracks' };  // 早期 `return` の目印になればいいだけなので内容はテキトー
    }
    if(queryResult?.result[0]?.success === false) {
      errorLog('D1 API の `success` レスポンスが `false` でした');
      return { error: 'Failed To Load D1 Tracks' };
    }
    if(queryResult?.result[0]?.results == null) {
      errorLog('D1 API の `results` レスポンスが `null` または `undefined` でした');
      return { error: 'Failed To Load D1 Tracks' };
    }
    
    // 取得結果が0件だった場合 : D1 の状態によっては0件で正常取得できているともみなせるため Warning・成功扱いとして終了する
    if(queryResult.result[0].results.length === 0) {
      result.status = 'success';
      warningLog('D1 API の `results` レスポンスが空配列でした・テーブルにレコードが1件も存在していないようです');
      return { error: 'No Records' };
    }
    
    const d1Tracks = queryResult.result[0].results as Array<D1Track>;
    return { result: d1Tracks };
  }
  catch(error) {
    errorLog('D1 API のコールに失敗しました : アカウント情報が誤っているか、テーブルが存在しない可能性があります', error);
    return { error: 'Failed To Load D1 Tracks' };
  }
};

/** メイン関数 */
const main = async (): Promise<void> => {
  // `.env` ファイルを読み込む : ファイルがなければ `ENOENT` エラーになる (`node` や `tsx` の実行時オプションの `--env-file` でも同等だがコチラの方がプログラム内で分かりやすいと思い採用)
  try {
    process.loadEnvFile();
  }
  catch(error) {
    return errorLog('`.env` ファイルが見つかりませんでした', error);
  }
  
  const d1ApiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
  if(d1ApiToken == null) return errorLog('`.env` ファイルで `CLOUDFLARE_D1_API_TOKEN` を定義してください');
  
  // D1 から全楽曲を取得する
  const d1TracksResult = await loadD1Tracks(d1ApiToken);
  if(d1TracksResult.error != null) return;  // エラー時は早期 `return` する
  
  // Zod で想定どおりの型かチェックしながら詰めていく
  const d1Tracks = d1TracksResult.result;
  result.summary.total_tracks = d1Tracks.length;
  
  d1Tracks.forEach(d1Track => {
    const parsed = d1TrackSchema.safeParse(d1Track);
    if(parsed.success) {
      result.valid_tracks.push(parsed.data);
      result.summary.valid_tracks++;
    }
    else {
      // 件数が多かった場合にコンソール出力が多いと鬱陶しいのでコンソール出力はしない
      result.invalid_tracks.push({ ...d1Track, warning: `Zod パースに失敗しました : ${mergeZodIssues(parsed.error)}` });
      result.summary.invalid_tracks++;
    }
  });
  
  console.log(`[${jst()}] 実行結果サマリ :`);
  console.log(`[${jst()}]   総楽曲数                   : ${result.summary.total_tracks}`);
  console.log(`[${jst()}]   Zod パースを通過した楽曲数 : ${result.summary.valid_tracks}`);
  console.log(`[${jst()}]   Zod パースに失敗した楽曲数 : ${result.summary.invalid_tracks}`);
  console.log(`[${jst()}]   Warning 件数               : ${result.warnings.length}`);
  console.log(`[${jst()}]   エラー件数                 : ${result.errors.length}`);
  
  // 状態を確認する : 早期 `return` 忘れなどがないか全体的にチェックする
  if(result.summary.total_tracks === 0) {  // 0件と分かっていれば早期 `return` しているはずなのでココに到達していたら想定外
    errorLog('総楽曲数が0件です・早期 `return` 忘れの実装誤りの恐れがあります');
  }
  if(result.summary.valid_tracks === 0 || result.valid_tracks.length === 0) {  // 正常なら早期 `return` しているはず・ココで発生している場合は全 Zod パースに失敗している可能性アリ
    errorLog('Zod パースを通過した D1 楽曲が0件です・早期 `return` 忘れ、もしくは Zod スキーマとテーブル定義に齟齬がある可能性があります');
  }
  if(result.summary.invalid_tracks > 0 || result.invalid_tracks.length > 0) {  // 本来0件を目指すモノなのであったらダメ
    errorLog('Zod パースに失敗した D1 楽曲が存在します・Zod スキーマとテーブル定義に齟齬がある可能性があります');
  }
  if(result.warnings.length > 0) {  // Warning に関しては早期 `return` しているはずなのでココに到達していたら想定外
    errorLog('Warning が検出されています・早期 `return` 忘れの実装誤りの恐れがあります');
  }
  
  // 件数の不一致がないかチェックする
  const totalCount = result.summary.valid_tracks + result.summary.invalid_tracks;
  if(result.summary.total_tracks !== totalCount) {
    errorLog(`総処理した楽曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Valid ${result.summary.valid_tracks}・Invalid ${result.summary.invalid_tracks}・差異 ${result.summary.total_tracks - totalCount}`);
  }
  if(result.summary.valid_tracks !== result.valid_tracks.length) {
    errorLog(`Zod パースを通過した D1 楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.valid_tracks}・実数 ${result.valid_tracks.length}・差異 ${result.summary.valid_tracks - result.valid_tracks.length}`);
  }
  if(result.summary.invalid_tracks !== result.invalid_tracks.length) {
    errorLog(`Zod パースに失敗した D1 楽曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.invalid_tracks}・実数 ${result.invalid_tracks.length}・差異 ${result.summary.invalid_tracks - result.invalid_tracks.length}`);
  }
  
  // 最後にステータスを更新する
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
    console.log(`[${jst()}] Load D1 Tracks : Finished`);
  }
})();
