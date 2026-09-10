import Cloudflare from 'cloudflare';
import process from 'node:process';

import { cloudflareAccountId, d1DatabaseId, d1TracksFileName, extensionNameJson } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { getJst } from './lib/get-jst.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';
import { D1TracksJson } from './types/d1-tracks-json.js';
import { D1Track, d1TrackSchema } from './schemas/d1-track.js';
import { mergeZodIssues } from './lib/merge-zod-issues.js';

// --------------------------------------------------
// Load D1 Tracks : D1 から `tracks` テーブルを全件取得して JSON ファイルに出力する
// --------------------------------------------------

console.log(`[${getJst()}] Load D1 Tracks : Start`);

const logDirectoryPath = createLogDirectory();

const result: D1TracksJson = {
  executed_at: getJst(),
  status: 'failed',  // 成功時に `success` に切り替える
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
    writeResultFile(logDirectoryPath, d1TracksFileName, extensionNameJson, result.executed_at, data);
  }
  
  console.log(`[${getJst()}] Load D1 Tracks : Finished`);
};

// 早期 Return したいので即時関数でラップする
(async () => {
  // `.env` ファイルを読み込む : ファイルがなければ `ENOENT` エラーになる (`node` や `tsx` の実行時オプションの `--env-file` でも同等だがコチラの方がプログラム内で分かりやすいと思い採用)
  try {
    process.loadEnvFile();
  }
  catch(error) {
    console.error(`[${getJst()}] [ERROR] .env ファイルが見つかりませんでした`, error);
    result.errors.push({ error: `.env ファイルが見つかりませんでした : ${serializeError(error)}` });
    return writeResult();
  }
  
  const d1ApiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
  if(d1ApiToken == null) {
    console.error(`[${getJst()}] [ERROR] .env ファイルで CLOUDFLARE_D1_API_TOKEN を定義してください`);
    result.errors.push({ error: '.env ファイルで CLOUDFLARE_D1_API_TOKEN を定義してください' });
    return writeResult();
  }
  
  // D1 から全トラックを取得する
  let rawD1Tracks: Array<unknown> = [];
  try {
    const client = new Cloudflare({ apiToken: d1ApiToken });
    const queryResult = await client.d1.database.query(d1DatabaseId, {
      account_id: cloudflareAccountId,
      sql: 'SELECT * FROM tracks'
    });
    
    // 実行結果の不正が分かれば早期 Return → `finally` で結果ファイルを出力して終了する
    if(queryResult?.result[0]?.success == null) {
      console.error(`[${getJst()}] [ERROR] D1 API の \`success\` レスポンスが \`null\` または \`undefined\` でした`);
      result.errors.push({ error: 'D1 API の `success` レスポンスが `null` または `undefined` でした' });
      return writeResult();
    }
    if(queryResult?.result[0]?.success === false) {
      console.error(`[${getJst()}] [ERROR] D1 API の \`success\` レスポンスが \`false\` でした`);
      result.errors.push({ error: 'D1 API の `success` レスポンスが `false` でした' });
      return writeResult();
    }
    if(queryResult?.result[0]?.results == null) {
      console.error(`[${getJst()}] [ERROR] D1 API の \`results\` レスポンスが \`null\` または \`undefined\` でした`);
      result.errors.push({ error: 'D1 API の `results` レスポンスが `null` または `undefined` でした' });
      return writeResult();
    }
    
    // 取得結果が0件だった場合 : D1 の状態によっては0件で正常取得できているともみなせるため Warning・成功扱いとして終了する
    if(queryResult.result[0].results.length === 0) {
      result.status = 'success';
      console.warn(`[${getJst()}] [WARN] D1 API の \`results\` レスポンスが空配列でした・テーブルにレコードが1件も存在していないようです`)
      result.warnings.push({ warning: 'D1 API の `results` レスポンスが空配列でした・テーブルにレコードが1件も存在していないようです' });
      return writeResult();
    }
    
    // 1件以上取得できた時 : Zod で想定どおりの型かチェックしながら詰めていく
    rawD1Tracks = queryResult.result[0].results;
  }
  catch(error) {
    console.error(`[${getJst()}] [ERROR] D1 API のコールに失敗しました : アカウント情報が誤っているか、テーブルが存在しない可能性があります`, error);
    result.errors.push({ error: `D1 API のコールに失敗しました : ${serializeError(error)}` });
    return writeResult();
  }
  
  // `rawD1Tracks` を Zod で想定どおりの型かチェックしながら詰めていく
  result.summary.total_tracks = rawD1Tracks.length;
  
  rawD1Tracks.forEach(rawD1Track => {
    const parsed = d1TrackSchema.safeParse(rawD1Track);
    if(parsed.success) {
      result.valid_tracks.push(parsed.data);
      result.summary.valid_tracks++;
    }
    else {
      // 件数が多かった場合にコンソール出力が多いと鬱陶しいのでコンソール出力はしない
      const warningD1Track = rawD1Track as D1Track;
      result.invalid_tracks.push({ ...warningD1Track, warning: `Zod パースに失敗しました : ${mergeZodIssues(parsed.error)}` });
      result.summary.invalid_tracks++;
    }
  });
  
  console.log(`[${getJst()}] 実行結果サマリ :`);
  console.log(`[${getJst()}]   総トラック数           : ${result.summary.total_tracks}`);
  console.log(`[${getJst()}]   Zod パースを通過した数 : ${result.summary.valid_tracks}`);
  console.log(`[${getJst()}]   Zod パースに失敗した数 : ${result.summary.invalid_tracks}`);
  console.log(`[${getJst()}]   Warning 件数           : ${result.warnings.length}`);
  console.log(`[${getJst()}]   エラー件数             : ${result.errors.length}`);
  
  // 状態を確認する : 早期 Return 忘れなどがないか全体的にチェックする
  if(result.summary.total_tracks === 0) {  // 0件と分かっていれば早期 Return しているはず
    console.error(`[${getJst()}] [ERROR] 総トラック数が0件です・早期 Return 忘れの実装誤りの恐れがあります`);
    result.errors.push({ error: '総トラック数が0件です・早期 Return 忘れの実装誤りの恐れがあります' });
  }
  if(result.summary.valid_tracks === 0 || result.valid_tracks.length === 0) {  // 正常なら早期 Return しているはず・ココで発生している場合は全 Zod パースに失敗している可能性アリ
    console.error(`[${getJst()}] [ERROR] Zod パースを通過した D1 トラックが0件です・早期 Return 忘れ、もしくは Zod スキーマとテーブル定義に齟齬がある可能性があります`);
    result.errors.push({ error: 'Zod パースを通過した D1 トラックが0件です・早期 Return 忘れ、もしくは Zod スキーマとテーブル定義に齟齬がある可能性があります' });
  }
  if(result.summary.invalid_tracks > 0 || result.invalid_tracks.length > 0) {  // 本来0件を目指すモノなのであったらダメ
    console.error(`[${getJst()}] [ERROR] Zod パースに失敗した D1 トラックが存在します・Zod スキーマとテーブル定義に齟齬がある可能性があります`);
    result.errors.push({ error: 'Zod パースに失敗した D1 トラックが存在します・Zod スキーマとテーブル定義に齟齬がある可能性があります' });
  }
  if(result.warnings.length > 0) {  // Warning に関しては早期 Return しているはず
    console.error(`[${getJst()}] [ERROR] Warning が検出されています・早期 Return 忘れの実装誤りの恐れがあります`);
    result.errors.push({ error: 'Warning が検出されています・早期 Return 忘れの実装誤りの恐れがあります' });
  }
  
  // 件数不一致
  const totalCount = result.summary.valid_tracks + result.summary.invalid_tracks;
  if(result.summary.total_tracks !== totalCount) {
    console.error(`[${getJst()}] [ERROR] 総処理した曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Valid ${result.summary.valid_tracks}・Invalid ${result.summary.invalid_tracks}・差異 ${result.summary.total_tracks - totalCount}`);
    result.errors.push({ error: `総処理した曲数カウントが不一致です・実装誤りの恐れがあります : Total ${result.summary.total_tracks}・Valid ${result.summary.valid_tracks}・Invalid ${result.summary.invalid_tracks}・差異 ${result.summary.total_tracks - totalCount}` });
  }
  if(result.summary.valid_tracks !== result.valid_tracks.length) {
    console.error(`[${getJst()}] [ERROR] Zod パースを通過した D1 曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.valid_tracks}・実数 ${result.valid_tracks.length}・差異 ${result.summary.valid_tracks - result.valid_tracks.length}`);
    result.errors.push({ error: `Zod パースを通過した D1 曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.valid_tracks}・実数 ${result.valid_tracks.length}・差異 ${result.summary.valid_tracks - result.valid_tracks.length}` });
  }
  if(result.summary.invalid_tracks !== result.invalid_tracks.length) {
    console.error(`[${getJst()}] [ERROR] Zod パースに失敗した D1 曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.invalid_tracks}・実数 ${result.invalid_tracks.length}・差異 ${result.summary.invalid_tracks - result.invalid_tracks.length}`);
    result.errors.push({ error: `Zod パースに失敗した D1 曲数カウントが不一致です・実装誤りの恐れがあります : Count ${result.summary.invalid_tracks}・実数 ${result.invalid_tracks.length}・差異 ${result.summary.invalid_tracks - result.invalid_tracks.length}` });
  }
  
  // 最後にステータスを更新する : ココまでで `result.errors` が0件だったら `success` とする
  if(result.errors.length === 0) {
    result.status = 'success';
    console.log(`[${getJst()}] 全件正常終了`);
  }
  
  writeResult();
})();
