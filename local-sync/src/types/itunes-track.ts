/**
 * iTunes ライブラリからエクスポートした1楽曲の型
 * 
 * - 必須入力項目のバリデーションなどは別途行う
 * - iTunes COM の仕様上、「アルバム名が iTunes 上で空欄」の時は `tracks.Item(i).Album` が空文字ではなく `null` で返されるため、iTunes 上「空欄」にできる項目は `null` も想定しておく
 */
export type ItunesTrack = {
  /** アーティスト名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  artist: string | null;
  /** アルバム名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  album: string | null;
  /** トラック番号 : iTunes 上で「空欄」でも `0` が入るので `null` は想定しないでおく */
  track_number: number;
  /** 曲名 : iTunes 上で必ず1文字以上求められ空欄にはできないので `null` は付けないでおく */
  title: string;
  
  /** iTunes ライブラリの Persistent ID High */
  persistent_id_high: number;
  /** iTunes ライブラリの Persistent ID Low */
  persistent_id_low: number;
  
  /** iTunes ライブラリから取得したコメント・iTunes 上で「空欄」にできるため `null` を指定しておく・D1 の `tracks` テーブルのカラム名と予め合わせておく */
  imported_comment: string | null;
};
