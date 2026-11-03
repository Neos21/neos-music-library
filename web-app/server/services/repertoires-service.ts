import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { EditRepertoire, RepertoireListItem } from '../../shared/types/repertoire';
import type { Result } from '../../shared/types/utilities/result';
import type { RepertoireRow } from '../types/repertoire-row';

/** レパートリーの取得と楽曲の存在確認を伴う登録・更新・削除を扱う Service */
export class RepertoiresService {
  constructor(private readonly db: D1Database) { }
  
  /** 楽曲の存在に関係なく全レパートリーを取得し、紐付く楽曲情報を添える */
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
  
  /** 紐付ける対象の楽曲の存在を確認し、レパートリーを登録する */
  public async create(repertoire: EditRepertoire): Promise<Result<RepertoireListItem>> {
    const track = repertoire.track_id == null ? null : await new TracksRepository(this.db).findById(repertoire.track_id);
    if(repertoire.track_id != null && track == null) return { error: '紐付く楽曲が存在しません' };
    
    const result = await new RepertoiresRepository(this.db).create(repertoire);
    return { result: { ...repertoire, id: result.meta.last_row_id, track } };
  }
  
  /** 紐付ける対象の楽曲の存在を確認し、レパートリーを更新する */
  public async update(id: number, repertoire: EditRepertoire): Promise<Result<RepertoireListItem>> {
    const track = repertoire.track_id == null ? null : await new TracksRepository(this.db).findById(repertoire.track_id);
    if(repertoire.track_id != null && track == null) return { error: '紐付く楽曲が存在しません' };
    
    await new RepertoiresRepository(this.db).update(id, repertoire);
    return { result: { ...repertoire, id, track } };
  }
  
  /** レパートリーを削除する */
  public async delete(id: number): Promise<Result<number>> {
    await new RepertoiresRepository(this.db).delete(id);
    return { result: id };
  }
}
