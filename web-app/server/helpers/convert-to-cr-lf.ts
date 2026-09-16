/**
 * CR+LF・CR・LF 全ての改行コードを CR+LF に統一する
 * 
 * - iTunes で編集したコメント = ID3 タグの改行コードは CR+LF なので、D1 の `tracks.comment` は CR+LF で保存する
 * - `textarea` 要素には CR+LF の値をそのまま表示しても問題はなく、JavaScript の世界で値を扱う際に LF に正規化される場合がある
 */
export const convertToCrLf = (value: string): string => value.replace((/\r\n|\r|\n/g), '\r\n');
