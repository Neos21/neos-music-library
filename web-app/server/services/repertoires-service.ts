import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { EditRepertoire, RepertoireListItem } from '../../shared/types/repertoire';
import type { Result } from '../../shared/types/utilities/result';
import type { RepertoireRow } from '../types/repertoire-row';

/** レパートリーと紐付く楽曲を管理する Service */
export class RepertoiresService {
  constructor(private readonly db: D1Database) { }
  
  /** レパートリー一覧を取得する・紐付く楽曲があれば一緒に取得する */
  public async findAll(): Promise<Array<RepertoireListItem>> {
    const result = await this.db
      .prepare(`
        SELECT
          repertoires.id,
          repertoires.track_id,
          repertoires.artist,
          repertoires.album,
          repertoires.title,
          repertoires.part,
          repertoires.proficiency,
          repertoires.memo,
          
          tracks.id      AS linked_track_id,
          tracks.artist  AS track_artist,
          tracks.album   AS track_album,
          tracks.title   AS track_title
        FROM repertoires
          LEFT JOIN tracks ON tracks.id = repertoires.track_id
        ORDER BY
          COALESCE(tracks.artist, repertoires.artist)  ASC,
          COALESCE(tracks.album , repertoires.album )  ASC,
          COALESCE(tracks.title , repertoires.title )  ASC,
          repertoires.id                               ASC
      `)
      .all<RepertoireRow>();
    return (result.results ?? []).map(row => ({
      id         : row.id,
      track_id   : row.track_id,
      artist     : row.artist,
      album      : row.album,
      title      : row.title,
      part       : row.part,
      proficiency: row.proficiency,
      memo       : row.memo,
      track      : row.linked_track_id == null ? null : {
        id    : row.linked_track_id,
        artist: row.track_artist,
        album : row.track_album,
        title : row.track_title!
      }
    }));
  }
  
  /** 紐付ける対象の楽曲の存在を確認し、レパートリーを登録する・登録した ID を返す */
  public async create(repertoire: EditRepertoire): Promise<Result<number>> {
    const trackId = repertoire.track_id == null ? null : await new TracksRepository(this.db).findById(repertoire.track_id);
    if(repertoire.track_id != null && trackId == null) return { error: '紐付く楽曲が存在しません' };
    
    const result = await new RepertoiresRepository(this.db).create(repertoire);
    return { result: result.meta.last_row_id };
  }
  
  /** 紐付ける対象の楽曲の存在を確認し、レパートリーを更新する */
  public async update(id: number, repertoire: EditRepertoire): Promise<Result<true>> {
    const trackId = repertoire.track_id == null ? null : await new TracksRepository(this.db).findById(repertoire.track_id);
    if(repertoire.track_id != null && trackId == null) return { error: '紐付く楽曲が存在しません' };
    
    await new RepertoiresRepository(this.db).update(id, repertoire);
    return { result: true };
  }
}
