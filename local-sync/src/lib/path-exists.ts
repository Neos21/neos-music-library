import fs from 'node:fs';

/**
 * ファイルまたはディレクトリが存在するか否か判定する
 * 
 * @param targetPath ファイルパス or ディレクトリパス
 * @returns ファイルやディレクトリが存在すれば `true`・存在しなければ `false`
 */
export const pathExists = (targetPath: string): boolean => {
  try {
    fs.statSync(targetPath);
    return true;
  }
  catch {
    return false;
  }
};
