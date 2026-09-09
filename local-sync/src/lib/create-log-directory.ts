import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const fileName = url.fileURLToPath(import.meta.url);  // このファイルの絶対パス
const dirName = path.dirname(fileName);  // このファイルが属するディレクトリパス

/**
 * ログディレクトリを作成し、ログディレクトリのパスを返す
 * 
 * @returns ログディレクトリのパス
 */
export const createLogDirectory = (): string => {
  // 本ファイルは `src/lib/` 配下にあるので `src/` と同階層に `logs/` ディレクトリを作成する
  const logDirectoryPath = path.resolve(dirName, '..', '..', 'logs');
  // `recursive: true` 付きなので存在チェックしなくて良い
  fs.mkdirSync(logDirectoryPath, { recursive: true });
  return logDirectoryPath;
};
