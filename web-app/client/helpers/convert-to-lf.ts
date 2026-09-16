/**
 * CR+LF・CR 全ての改行コードを LF に統一する
 * 
 * - D1 の `tracks.comment` は CR+LF で保存してある
 * - `textarea.value` は LF に正規化されるようなので、クライアントサイドでは編集開始前から LF に統一して扱う
 * - CR+LF への変換はサーバサイドで保存前に行う
 */
export const convertToLf = (value: string): string => value.replace((/\r\n|\r/g), '\n');
