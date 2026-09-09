import winax from 'winax';

import fs from 'node:fs';
import path from 'node:path';

import { createLogDirectory } from './lib/create-log-directory.js';
import { RawItunesTrack } from './types/raw-itunes-track.js';
import { serializeError } from './lib/serialize-error.js';
import { getJst } from './lib/get-jst.js';

/** 本スクリプトが出力する結果ファイルの型定義 */
type Result = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 成功 (Warning・Error なし)・失敗 (後続処理の実行不可能) */
  status: 'success' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** `iTunes.LibraryPlaylist.Tracks` で取得した全トラック数 */
    total_tracks: number;
    /** `raw_itunes_tracks` として出力したトラック数 */
    exported_tracks: number;
    /** Podcast のトラックと判定して除外したトラック数 */
    podcast_tracks: number;
    /** バリデーションで Warning を確認したトラック数 */
    warning_tracks: number;
    /** 処理中にエラーが発生したトラック数 */
    error_tracks: number;
  };
  /** iTunes から取得したトラック情報 */
  raw_itunes_tracks: Array<RawItunesTrack>;
  /** バリデーションエラーの情報 */
  warnings: Array<RawItunesTrack & { warnings: Array<string>; }>;
  /** 実行中のエラー情報 */
  errors: Array<Partial<RawItunesTrack> & { error: string; }>;
};

/**
 * iTunes から取得した楽曲情報に対して、運用上の不正値を判定する
 * 
 * @returns 運用上の不正値があれば文字列の配列を返す・全項目問題なければ空の配列を返す
 */
const validateItunesTrack = (rawItunesTrack: RawItunesTrack): Array<string> => {
  const warnings = [];
  
  if(rawItunesTrack.artist == null) warnings.push('アーティスト名が null (iTunes 上で空欄) です');
  else if(rawItunesTrack.artist === '') warnings.push('アーティスト名が空文字です (想定外)');
  else if(rawItunesTrack.artist !== String(rawItunesTrack.artist).trim()) warnings.push('アーティスト名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.album == null) warnings.push('アルバム名が null (iTunes 上で空欄) です・アルバム名がない場合は「■」を明記してください');
  else if(rawItunesTrack.album === '') warnings.push('アルバム名が空文字です (想定外)');
  else if(rawItunesTrack.album !== String(rawItunesTrack.album).trim()) warnings.push('アルバム名の前後に空白文字が混ざっています');
  
  // `track_number` は空欄時 `0` で出力され `null` になることはない
  
  if(rawItunesTrack.title == null) warnings.push('曲名が null です (iTunes 上では空欄にできないため想定外)');
  else if(rawItunesTrack.title === '') warnings.push('曲名が空文字です (想定外)');
  else if(rawItunesTrack.title !== String(rawItunesTrack.title).trim()) warnings.push('曲名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.persistent_id_high == null) warnings.push('Persistent ID High が null です・取得できていないようです (想定外)');
  
  if(rawItunesTrack.persistent_id_low == null) warnings.push('Persistent ID Low が null です・取得できていないようです (想定外)');
  
  // `imported_comment` は空欄 (`null`) も全然あり得るので特にチェックなし
  
  return warnings;
};


// Main
// --------------------------------------------------

const logDirectoryPath = createLogDirectory();

const result: Result = {
  executed_at: '',
  status: 'success',  // 終了後に状態を見て必要に応じて `failed` に切り替える
  summary: {
    total_tracks: 0,
    exported_tracks: 0,
    podcast_tracks: 0,
    warning_tracks: 0,
    error_tracks: 0
  },
  raw_itunes_tracks: [],
  warnings: [],
  errors: []
};

try {
  console.log(`[${getJst()}] Export iTunes Library : Start`);
  result.executed_at = getJst();
  
  const iTunes = new winax.Object('iTunes.Application');  // iTunes が起動していなかったら自動的に起動する
  
  const tracks = iTunes.LibraryPlaylist.Tracks;
  result.summary.total_tracks = tracks.Count;
  console.log(`[${getJst()}] 総トラック数 : ${result.summary.total_tracks} 件`);
  
  for(let i = 1; i <= result.summary.total_tracks; i++) {  // Tracks は 1 始まり
    if(i % 200 === 0) console.log(`[${getJst()}] ${i} 件目を処理中…`);  // テキトーに進捗表示
    
    // 1曲ごとの情報取得に失敗する場合は起こり得るようなので個別に `try`・`catch` する
    try {
      const trackItem = tracks.Item(i);
      
      // Podcast もトラックとして含まれる・本アプリでは取り扱わないので除外する
      if(trackItem.Podcast) {
        result.summary.podcast_tracks++;
        continue;
      }
      
      // 先に COM 呼び出し等の処理を済ませる (万が一エラーが発生したら `catch` に落とす)
      const rawItunesTrack: RawItunesTrack = {
        artist            : trackItem.Artist,
        album             : trackItem.Album,
        track_number      : trackItem.TrackNumber,
        title             : trackItem.Name,
        persistent_id_high: iTunes.ITObjectPersistentIDHigh(trackItem),
        persistent_id_low : iTunes.ITObjectPersistentIDLow(trackItem),
        imported_comment  : trackItem.Comment
      };
      const warnings = validateItunesTrack(rawItunesTrack);
      
      // 処理が正常に終わったら結果を書き込む
      result.raw_itunes_tracks.push(rawItunesTrack);
      result.summary.exported_tracks++;
      
      if(warnings.length > 0) {
        result.warnings.push({ ...rawItunesTrack, warnings });
        result.summary.warning_tracks++;
      }
    }
    catch(trackError) {
      // ストリームなど解釈できなかったモノは無視する
      console.error(`[${getJst()}] [ERROR] トラック情報取得中のエラー・次のトラック処理に移動します`, trackError);
      result.errors.push({ error: serializeError(trackError) });
      result.summary.error_tracks++;
    }
  }
  
  console.log(`[${getJst()}] 全件エクスポート完了`);
}
catch(error) {
  console.error(`[${getJst()}] [ERROR] 致命的なエラー発生・全件処理が完了していない恐れがあります`, error);
  result.errors.push({ error: serializeError(error) });
}
finally {
  console.log(`[${getJst()}] 実行結果サマリ : `);
  console.log(`[${getJst()}]   総トラック数       : ${result.summary.total_tracks}`);
  console.log(`[${getJst()}]   エクスポートした数 : ${result.summary.exported_tracks}`);
  console.log(`[${getJst()}]   Podcast のため除外 : ${result.summary.podcast_tracks}`);
  console.log(`[${getJst()}]   エラーがあった楽曲 : ${result.summary.error_tracks}`);
  console.log(`[${getJst()}]   Warning があった数 : ${result.summary.warning_tracks}`);
  
  if(result.warnings.length > 0) {
    console.warn(`[${getJst()}] [WARN] Warning 判定された楽曲があります・内容を確認して iTunes ライブラリを修正し、本スクリプトを再実行してください`);
  }
  if(result.errors.length > 0) {
    result.status = 'failed';
    console.error(`[${getJst()}] [ERROR] エラーが出力されています・内容を確認してください`);
  }
  // TODO : `summary` の数値と実際の配列数に差分がないか念のためチェック必要か？
  // TODO : Total と Exported + Podcast + Error Tracks の数は一致してるはず・不一致なら何かおかしい (Warning は含めない)
  
  // TODO : アーティスト名・アルバム名・楽曲名の3つが同じ曲 = 重複曲と判定できるが、チェックすべきか？
  
  // TODO : 上書きになっちゃうので要調整・`try`・`catch` も要るかな
  fs.writeFileSync(path.resolve(logDirectoryPath, 'raw-itunes-tracks.json'), JSON.stringify(result, null, 2) + '\n', 'utf-8');
  
  console.log(`[${getJst()}] Export iTunes Library : Finished`);
}
