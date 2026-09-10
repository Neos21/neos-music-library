import Cloudflare from 'cloudflare';

import { cloudflareAccountId, d1DatabaseId, extensionNameJson, queriesFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { getJst } from './lib/get-jst.js';
import { writeResultFile } from './lib/write-result-file.js';

// --------------------------------------------------
// Generate Queries : iTunes ライブラリと D1 のデータを突合して INSERT・UPDATE クエリの生成・DELETE 候補を出力する
// --------------------------------------------------

console.log(`[${getJst()}] Generate Queries : Start`);

const logDirectoryPath = createLogDirectory();

const result = {
  executed_at: getJst(),
  status: 'failed',  // 成功時のみ `success` に切り替える
  inserts: [],
  updates: [],
  candidates_to_delete: [],
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
    writeResultFile(logDirectoryPath, queriesFileName, extensionNameJson, result.executed_at, data);
  }
  
  console.log(`[${getJst()}] Generate Queries : Finished`);
};

// TODO : Query API の動作確認中
(async () => {
  process.loadEnvFile();
  const d1ApiToken = process.env.CLOUDFLARE_D1_API_TOKEN;
  const client = new Cloudflare({ apiToken: d1ApiToken });
  const queryResult = await client.d1.database.query(d1DatabaseId, {
    account_id: cloudflareAccountId,
    //sql : 'INSERT INTO tracks (artist, album, title, persistent_id_high, persistent_id_low) VALUES ("Example Artist", "Example Album", "Example Title", 1, 2)'
    //sql : 'UPDATE tracks SET artist = "Example 2" WHERE id = 2'
    sql: 'SELECT * FROM tracks'
    //sql : 'DELETE FROM tracks WHERE id = 3'
  });
  console.dir(queryResult, { depth: null });
})();

/*
- Query API は複数の SQL やバッチ実行を前提にしているから `result` が配列になっている
- `sql : 'INSERT ...; SELECT ...;'` のようにセミコロンで区切れば1回の呼び出しで複数クエリが実行でき、それぞれが配列要素で返される
queryResult.result[0]?.success
queryResult.result[0]?.meta
queryResult.result[0]?.results

- INSERT 時
{
  result : [
    {
      results : [],
      success : true,
      meta : {
        served_by : 'v3-prod',
        served_by_region : 'APAC',
        served_by_colo : 'NRT',
        served_by_primary : true,
        timings : { sql_duration_ms : 0.3003 },
        duration : 0.3003,
        changes : 1,
        last_row_id : 2,  // ← INSERT 時はコレが INSERT された ID になる
        changed_db : true,
        size_after : 28672,
        rows_read : 1,
        rows_written : 2,
        total_attempts : 1
      }
    }
  ]
}

- SELECT 時
{
  result : [
    {
      results : [
        {
          id : 2,
          artist : 'Example Artist',
          album : 'Example Album',
          track_number : null,
          title : 'Example Title',
          persistent_id_high : 1,
          persistent_id_low : 2,
          comment : null,
          imported_comment : null,
          imported_at : null,
          comment_updated_at : null,
          comment_synced_at : null,
          comment_sync_status : 'synced',
          comment_sync_status_updated_at : null,
          rebind_status : 'bound',
          rebind_status_updated_at : null,
          created_at : '2026-09-10 02 : 13 : 51',
          updated_at : '2026-09-10 02 : 13 : 51'
        }
      ],
      success : true,
      meta : {
        served_by : 'v3-prod',
        served_by_region : 'APAC',
        served_by_colo : 'NRT',
        served_by_primary : true,
        timings : { sql_duration_ms : 0.3503 },
        duration : 0.3503,
        changes : 0,
        last_row_id : 0,
        changed_db : false,
        size_after : 28672,
        rows_read : 1,
        rows_written : 0,
        total_attempts : 1
      }
    }
  ]
}

- UPDATE 時
{
  result : [
    {
      results : [],
      success : true,
      meta : {
        served_by : 'v3-prod',
        served_by_region : 'APAC',
        served_by_colo : 'NRT',
        served_by_primary : true,
        timings : { sql_duration_ms : 0.249 },
        duration : 0.249,
        changes : 1,  // ← ココで更新された件数を見る
        last_row_id : 0,
        changed_db : true,
        size_after : 28672,
        rows_read : 1,
        rows_written : 1,
        total_attempts : 1
      }
    }
  ]
}

- DELETE 時
{
  result : [
    {
      results : [],
      success : true,
      meta : {
        served_by : 'v3-prod',
        served_by_region : 'APAC',
        served_by_colo : 'NRT',
        served_by_primary : true,
        timings : { sql_duration_ms : 0.2559 },
        duration : 0.2559,
        changes : 1,  // ← ココで削除された件数を見る
        last_row_id : 3,  // ← コレは削除した ID を示すモノではない
        changed_db : true,
        size_after : 28672,
        rows_read : 1,
        rows_written : 1,  // ← ココか changes を見る
        total_attempts : 1
      }
    }
  ]
}
*/
