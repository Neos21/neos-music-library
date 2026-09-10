import Cloudflare from 'cloudflare';
import process from 'node:process';

import { cloudflareAccountId, d1DatabaseId, d1TracksFileName, extensionNameJson } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { getJst } from './lib/get-jst.js';
import { serializeError } from './lib/serialize-error.js';
import { writeResultFile } from './lib/write-result-file.js';
import { D1TracksJson } from './types/d1-tracks-json.js';

// --------------------------------------------------
// Load D1 Tracks : D1 から `tracks` テーブルを全件取得して JSON ファイルに出力する
// --------------------------------------------------

console.log(`[${getJst()}] Load D1 Tracks : Start`);

const logDirectoryPath = createLogDirectory();

const result: D1TracksJson = {
  executed_at: getJst(),
  status: 'failed',  // 成功時のみ `success` に切り替える
  tracks: [],
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
    result.errors.push(`.env ファイルが見つかりませんでした : ${serializeError(error)}`);
    return writeResult();
  }
  
  const d1ApiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
  if(d1ApiToken == null) {
    console.error(`[${getJst()}] [ERROR] .env ファイルで CLOUDFLARE_D1_API_TOKEN を定義してください`);
    result.errors.push('.env ファイルで CLOUDFLARE_D1_API_TOKEN を定義してください');
    return writeResult();
  }
  
  try {
    const client = new Cloudflare({ apiToken: d1ApiToken });
    const queryResult = await client.d1.database.query(d1DatabaseId, {
      account_id: cloudflareAccountId,
      sql: 'SELECT * FROM tracks'
    });
    
    if(queryResult?.result?.[0]?.success == null) result.errors.push('D1 API の `success` レスポンスが `null` または `undefined` でした');
    else if(queryResult?.result?.[0]?.success === false) result.errors.push('D1 API の `success` レスポンスが `false` でした');
    
    if(queryResult?.result?.[0]?.results == null) {
      result.errors.push('D1 API の `results` レスポンスが `null` または `undefined` でした');
    }
    else {
      result.tracks = queryResult.result[0].results;
      result.status = 'success';
      if(queryResult.result[0].results.length === 0) {
        console.warn(`[${getJst()}] [WARN] D1 API の \`results\` レスポンスが空配列でした・テーブルにレコードが1件も存在していないようです`)
        result.warnings.push('D1 API の `results` レスポンスが空配列でした・テーブルにレコードが1件も存在していないようです');
      }
      else {
        console.log(`[${getJst()}] 取得件数 : ${queryResult.result[0].results.length}`);
      }
    }
  }
  catch(error) {
    console.error(`[${getJst()}] [ERROR] D1 API のコールに失敗しました : アカウント情報が誤っているか、テーブルが存在しない可能性があります`, error);
    result.errors.push(`D1 API のコールに失敗しました : ${serializeError(error)}`);
  }
  finally {
    writeResult();
  }
})();
