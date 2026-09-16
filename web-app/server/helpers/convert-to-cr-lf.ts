/**
 * CR+LF・CR・LF 全ての改行コードを CR+LF に統一する
 * 
 * - iTunes で編集したコメント = ID3 タグの改行コードは CR+LF なので、D1 の `tracks.comment` は CR+LF で保存する
 * - `textarea` 要素には CR+LF の値をそのまま表示しても問題はないが
 *   JavaScript で `textarea.value` を取得すると LF に正規化される模様
 *   そこでサーバサイドでは一律で CR+LF に変換して保存する
 */
export const convertToCrLf = (value: string): string => value.replace((/\r\n|\r|\n/g), '\r\n');
