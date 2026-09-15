import fs from 'node:fs';
import path from 'node:path';

import { extensionNameJson } from './constants.js';
import { createLogDirectory } from './lib/create-log-directory.js';
import { jst } from './lib/jst.js';

// --------------------------------------------------
// Remove Previous Files : 前回実行結果ファイルを削除する
// --------------------------------------------------

console.log(`[${jst()}] Remove Previous Files : Start`);

const logDirectoryPath = createLogDirectory();

/** ログディレクトリ直下にあるファイルとディレクトリを取得する */
const files = fs.readdirSync(logDirectoryPath, { withFileTypes: true });
/** 前回実行結果ファイルのみに絞り込む */
const previousJsonDirents = files
  .filter(dirent => dirent.isFile())
  .filter(dirent => dirent.name.includes('-previous-') && dirent.name.endsWith(extensionNameJson));

// 1件ずつ削除する
for(const previousJsonDirent of previousJsonDirents) {
  try {
    const previousJsonFilePath = path.join(previousJsonDirent.parentPath, previousJsonDirent.name);
    fs.rmSync(previousJsonFilePath);
    console.log(`[${jst()}] ${previousJsonDirent.name} を削除しました`);
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] ${previousJsonDirent.name} の削除に失敗しました`, error);
  }
}

console.log(`[${jst()}] Remove Previous Files : Finished`);
