/**
 * 常に JST で `YYYY-MM-DD` もしくは `YYYY-MM-DD HH:mm:SS` 形式の文字列を取得する
 * 
 * @param utcString 未指定なら (`null`・`undefined`) なら現在時刻を使用する・ISO 8601 (`YYYY-MM-DD HH:mm:SS`) 形式の文字列を渡せばそれを UTC 時間とみなして使用する
 * @param isDateOnly `true` を指定した場合は `YYYY-MM-DD` を返す・未指定時や `false` を明示指定した場合は `YYYY-MM-DD HH:mm:SS` を返す
 * @returns JST の `YYYY-MM-DD` もしくは `YYYY-MM-DD HH:mm:SS` 形式の文字列・引数 `utcString` が不正な形式だった場合は `-` を返す
 */
export const getJst = (utcString?: string | null, isDateOnly: boolean = false): string => {
  let time: number;
  if(utcString == null) {
    time = Date.now();
  }
  else {
    // ISO 8601 形式でなかったら NG とする
    if(!(/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/).test(utcString!)) return '-';
    
    const normalizedUtcString = `${utcString!.replace(' ', 'T')}Z`;
    time = new Date(normalizedUtcString).getTime();
  }
  
  const jst = new Date(time + ((new Date().getTimezoneOffset() + (9 /* Hours */ * 60 /* Minutes */)) * 60 /* Seconds */ * 1000 /* Milliseconds */));
  
  const year  = jst.getFullYear();
  const month = String(jst.getMonth() + 1).padStart(2, '0');
  const date  = String(jst.getDate()     ).padStart(2, '0');
  
  if(isDateOnly) return `${year}-${month}-${date}`;
  
  const hours   = String(jst.getHours()  ).padStart(2, '0');
  const minutes = String(jst.getMinutes()).padStart(2, '0');
  const seconds = String(jst.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
};
