/** ISO 8601 (`YYYY-MM-DD HH:mm:SS`) 形式の文字列をハイフン区切りに変換する・スペースとコロンを一括置換するので日付のみ `YYYY-MM-DD` が渡されても問題なし */
export const iso8601ToHyphen = (iso8601: string): string => iso8601.replaceAll(' ', '-').replaceAll(':', '-');
