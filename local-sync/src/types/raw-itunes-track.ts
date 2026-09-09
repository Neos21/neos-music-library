/**
 * iTunes ライブラリからエクスポートした楽曲情報
 * 
 * - 必須入力項目のバリデーションなどは別途行う
 * - iTunes COM の仕様上、「アルバム名が iTunes 上で空欄」の時は `tracks.Item(i).Album` が空文字ではなく `null` で返される
 *   そこで、iTunes 上「空欄」にできる項目は `null` も想定しておく
 */
export type RawItunesTrack = {
  /** アーティスト名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  artist: string | null;
  /** アルバム名 : iTunes 上で「空欄」にできるため `null` を指定しておく */
  album: string | null;
  /** トラック番号 */
  track_number: number | null;
  /** 曲名 : iTunes 上で必ず1文字以上求められ空欄にはできないので `null` は付けないでおく */
  title: string;
  
  /** iTunes ライブラリの Persistent ID High */
  persistent_id_high: number;
  /** iTunes ライブラリの Persistent ID Low */
  persistent_id_low: number;
  
  /** iTunes ライブラリから取得したコメント */
  imported_comment: string | null;
};
