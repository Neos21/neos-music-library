import fs from 'node:fs';
import path from 'node:path';

import { iso8601ToHyphen } from './iso8601-to-hyphen.js';
import { jst } from './jst.js';
import { pathExists } from './path-exists.js';

/**
 * 結果ファイルを書き込む : 既にファイルが存在する場合は既存ファイルをリネームして残すように処理する
 * 
 * @param logDirectoryPath 結果ファイルを出力するログディレクトリのパス
 * @param fileName 結果ファイル名 (拡張子なし)
 * @param extensionName 結果ファイルの拡張子 (`.txt` のようにドット始まり)
 * @param executedAtIso8601 ISO 8601 (`YYYY-MM-DD HH:mm:SS`) 形式の実行日時・既存ファイルが存在する場合のリネームに使用する
 * @param data 結果ファイルに書き込むテキスト
 */
export const writeResultFile = (logDirectoryPath: string, fileName: string, extensionName: string, executedAtIso8601: string, data: string): void => {
  try {
    const targetPath = path.resolve(logDirectoryPath, `${fileName}${extensionName}`);
    if(pathExists(targetPath)) {
      // 既にファイルが存在する場合は、別名で新規ファイルを保存 → 既存ファイルをリネーム → 保存しておいた新規ファイルルをリネーム、と操作して既存ファイルの消失リスクを小さくする
      const executedAtHyphen = iso8601ToHyphen(executedAtIso8601);
      const newFilePath = path.resolve(logDirectoryPath, `${fileName}-${executedAtHyphen}${extensionName}`);
      fs.writeFileSync(newFilePath, data, 'utf-8');
      
      const oldFilePath = path.resolve(logDirectoryPath, `${fileName}-previous-${executedAtHyphen}${extensionName}`);  // 既存ファイル内を参照して日時を特定しても良いが値が本当にあるか分からないため持ち込んだ値を利用する
      fs.renameSync(targetPath, oldFilePath);
      
      fs.renameSync(newFilePath, targetPath);
      console.log(`[${jst()}] 前回の結果ファイルをリネーム移動したうえで結果ファイル ${fileName}${extensionName} を保存しました`);
    }
    else {
      fs.writeFileSync(targetPath, data, 'utf-8');
      console.log(`[${jst()}] 結果ファイル ${fileName}${extensionName} を保存しました`);
    }
  }
  catch(error) {
    console.error(`[${jst()}] [ERROR] 結果ファイル ${fileName}${extensionName} の出力に失敗しました`, error);
  }
};
