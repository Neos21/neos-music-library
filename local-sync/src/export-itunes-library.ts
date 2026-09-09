import winax from 'winax';

import fs from 'node:fs';
import path from 'node:path';

import { createLogDirectory } from './lib/create-log-directory.js';
import { RawItunesTrack } from './types/raw-itunes-track.js';
import { serializeError } from './lib/serialize-error.js';

/** 本スクリプトが出力する結果ファイルの型定義 */
type Result = {
  /** 実行時刻 */
  executed_at: string;
  /** 実行結果 : 実行中 (本スクリプト内でのみの表現)・成功 (Warning・Error なし)・一部失敗 (後続処理は一応可能)・致命的エラーによる失敗 (後続処理の実行不可能) */
  status: 'executing' | 'success' | 'partial' | 'failed';
  /** 実行結果サマリ */
  summary: {
    /** `iTunes.LibraryPlaylist.Tracks` で取得した全トラック数 */
    total_tracks: number;
    /** `raw_itunes_tracks` として出力したトラック数 */
    exported_tracks: number;
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
  if(rawItunesTrack.artist === '') warnings.push('アーティスト名が空文字です (想定外)');
  if(rawItunesTrack.artist !== String(rawItunesTrack.artist).trim()) warnings.push('アーティスト名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.album == null) warnings.push('アルバム名が null (iTunes 上で空欄) です・アルバム名がない場合は「■」を明記してください');
  if(rawItunesTrack.album === '') warnings.push('アルバム名が空文字です (想定外)');
  if(rawItunesTrack.album !== String(rawItunesTrack.album).trim()) warnings.push('アルバム名の前後に空白文字が混ざっています');
  
  if(rawItunesTrack.track_number != null && rawItunesTrack.track_number <= 0) warnings.push('トラック番号に 0 か負数が指定されています (iTunes 上は 0 は空欄に更新・負数は入力不可のため想定外)');
  
  if(rawItunesTrack.title == null) warnings.push('曲名が null です (iTunes 上では空欄にできないため想定外)');
  if(rawItunesTrack.title === '') warnings.push('曲名が空文字です (想定外)');
  if(rawItunesTrack.title !== String(rawItunesTrack.title).trim()) warnings.push('曲名の前後に空白文字が混ざっています');
  
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
  status: 'executing',
  summary: {
    total_tracks: 0,
    exported_tracks: 0,
    warning_tracks: 0,
    error_tracks: 0
  },
  raw_itunes_tracks: [],
  warnings: [],
  errors: []
};

try {
  const iTunes = new winax.Object('iTunes.Application');  // iTunes が起動していなかったら自動的に起動する
  
  const tracks = iTunes.LibraryPlaylist.Tracks;
  result.summary.total_tracks = tracks.Count;
  
  for(let i = 1; i <= tracks.Count; i++) {  // Tracks は 1 始まり
    // 1曲ごとの情報取得に失敗する場合は起こり得るようなので個別に `try`・`catch` する
    try {
      const trackItem = tracks.Item(i);
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
      
      result.raw_itunes_tracks.push(rawItunesTrack);
      result.summary.exported_tracks++;
      if(warnings.length > 0) {
        result.warnings.push({ ...rawItunesTrack, warnings });
        result.summary.warning_tracks++;
      }
    }
    catch(trackError) {
      // ストリームなど解釈できなかったモノは無視する
      console.error('Track Error', trackError);
      result.errors.push({ error: serializeError(trackError) });
      result.summary.error_tracks++;
    }
  }
  // TODO
  console.log('Finished');
}
catch(error) {
  console.error('Export iTunes Library : Error', error);
  result.errors.push({ error: serializeError(error) });
}
finally {
  fs.writeFileSync(path.resolve(logDirectoryPath, 'raw-itunes-tracks.json'), JSON.stringify(result, null, 2), 'utf-8');
}
