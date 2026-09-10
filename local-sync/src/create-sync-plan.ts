import { extensionNameJson, syncPlanFileName } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { getJst } from './lib/get-jst.js';
import { writeResultFile } from './lib/write-result-file.js';

// --------------------------------------------------
// Create Sync Plan : iTunes ライブラリと D1 のデータを突合して同期計画を組み立てる
// --------------------------------------------------

console.log(`[${getJst()}] Create Sync Plan : Start`);

const logDirectoryPath = createLogDirectory();

const jstNow = getJst();

const result = {
  executed_at: jstNow,
  status: 'failed',  // 成功時のみ `success` に切り替える
  summary: {
    source_counts: {
      itunes_tracks: 0,
      d1_tracks: 0
    },
    reconciliation: {  // 分類
      inserts: 0,  // iTunes にあって D1 にない曲数
      deletes: 0,  // D1 にあって iTunes にない曲数
      matched: 0   // 両方にデータがある曲数
    },
    matched_tracks: {  // 両方にデータがある曲の差分内容
      // メタデータ・コメントともに差分なし
      fully_unchanged: 0,
      // メタデータの差分有無
      metadata_unchanged: 0,
      metadata_updates: 0,  // D1 に UPDATE を入れる件数
      // コメントの差分
      comment_unchanged: 0,
      comment_updates: 0,  // D1 に UPDATE を入れる件数
      comment_sync_to_local: 0,  // D1 の内容を MP3 に反映させるべき件数
      comment_conflicts: 0  // 手動解決が必要なコンフリクト件数
    },
    operations: {  // 必要な操作数
      insert_d1: 0,
      delete_d1: 0,
      update_metadata_d1: 0,
      update_comment_d1: 0,
      sync_comment_local: 0
    }
  },
  inserts: [],
  deletes: [],
  matched: [
    // {
    //   track_id, persistent_id_high, persistent_id_low,
    //   metadata_decision: {
    //     action: 'unchanged' OR 'update_d1',
    //     changes: UPDATE をかける項目の Key Value
    //   },
    //   comment_decision: {
    //     action: 'unchanged' OR 'update_d1' OR 'sync_to_local' OR 'conflict',
    //     base (D1 から取得した before iTunes), web (D1 から取得した Web での入力値), mp3 (iTunes から取得した MP3 の値)
    //   }
    // }
  ],
  errors: []
};

const commentConflictsResult = {
  executed_at: jstNow,
  status: 'has_conflicts',  // OR 'no_conflicts'・人間が作業終了した時に 'resolved' などにはしなくてもいいかな？resolution.value が null でなければ、というチェックをすれば良い
  summary: {
    conflicts: 0  // 念のための件数チェック用・手動操作中に行を消しちゃったりして不整合が出た場合の検出に
  },
  conflicts: [
    // {
    //   track_id, persistent_id_high, persistent_id_low,
    //   base, web, mp3,
    //   resolution?: { value: コンフリクト時に採用する値 (初期値は null), source: 'd1' OR 'local' OR 'manual' }  `source = d1` なら D1 の値を採用した扱いとして MP3 編集。`local` なら MP3 の値を採用した扱いとして D1 に UPDATE。`manual` なら全く別の値を採用した扱いとして両方に反映、とする
    // }
  ]
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
    writeResultFile(logDirectoryPath, syncPlanFileName, extensionNameJson, result.executed_at, data);
  }
  
  console.log(`[${getJst()}] Create Sync Plan : Finished`);
};

(async () => {
  // raw-itunes-tracks.json 読み込み → エラーなしを確認 → PID をキーにした Map に詰め替えつつノーマライズ
  // d1-tracks.json 読み込み → エラーなしを確認 → PID をキーにした Map に詰め替え
  
  // D1 の PID をキーに iTunes 側を走査 → iTunes 側に該当する PID がない曲は deletes に追加
  
  // iTunes 側の PID をキーに D1 側を走査
  // - D1 側に該当する PID がない → inserts に追加
  // - 両者で PID が合致
  //   - メタデータの差分チェック → 差分があれば metadata_updates としてマーク
  //   - コメントの差分チェック (3Way)
  //     - → D1 側に反映が必要と判断したら comment_updates としてマーク
  //     - → iTunes 側に反映が必要と判断したら comment_sync_to_local としてマーク
  //     - → コンフリクトと判断したら comment_conflicts としてマーク
  
  // inserts・deletes・matched 配列が出揃うので summary を集計 → 結果 JSON ファイルを書き出し (こっちは機械判定結果のみとし人間が書き換えないファイル)
  // コメントのコンフリクト修正用ファイルを書き出し (`resolution` プロパティを設けておいて人間が追記する)
  // スクリプト終了
  
  // → コンフリクト修正用ファイルのみ人間が判断して resolution プロパティの value と source を書き換え。コンフリクトがない場合も空配列のファイルとして存在していることを後続スクリプトの前提にする
  // → 先に Sync To Local スクリプトを実行。結果 JSON から機械的に comment_sync_to_local できるものと、コンフリクト修正用ファイルを参照して分かるものとを MP3 に反映する
  // → その後、Sync To D1 スクリプトを実行。結果 JSON から INSERT・DELETE・UPDATE を生成・実行。コンフリクト修正用ファイルを参照して分かるものを UPDATE として実行する
})();
