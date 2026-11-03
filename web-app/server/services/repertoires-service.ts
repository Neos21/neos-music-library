import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { CreateRepertoire, UpdateRepertoire, RepertoireListItem } from '../../shared/types/repertoire';
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
  
  /** 楽曲の存在を確認し、レパートリーを登録する */
  public async create(repertoire: CreateRepertoire): Promise<Result<number>> {
    if(repertoire.track_id != null) {
      const track = await new TracksRepository(this.db).findById(repertoire.track_id);
      if(track == null) return { error: '紐付く楽曲が存在しません' };
    }
    
    const result = await new RepertoiresRepository(this.db).prepareCreate(repertoire).run();
    return { result: result.meta.last_row_id };
  }
  
  /** レパートリーを更新する */
  public async update(id: number, repertoire: UpdateRepertoire): Promise<Result<number>> {
    const repertoiresRepository = new RepertoiresRepository(this.db);
    const existingRepertoire = await repertoiresRepository.findById(id);
    if(existingRepertoire == null) return { error: 'レパートリーが存在しません' };
    if(repertoire.track_id !== undefined) {
      if(repertoire.track_id == null) return { error: '紐付くトラック ID が不正です' };
      if(existingRepertoire.track_id != null) return { error: '紐付く楽曲は変更できません' };
      if(await new TracksRepository(this.db).findById(repertoire.track_id) == null) return { error: '紐付く楽曲が存在しません' };
    }
    
    await this.db.batch([
      repertoiresRepository.prepareUpdate(id, repertoire),
      ...(repertoire.track_id == null ? [] : [repertoiresRepository.prepareLinkTrack(id, repertoire.track_id)])
    ]);
    return { result: id };
  }
  
  /** レパートリーを削除する */
  public async delete(id: number): Promise<Result<number>> {
    const repertoiresRepository = new RepertoiresRepository(this.db);
    if(await repertoiresRepository.findById(id) == null) return { error: 'レパートリーが存在しません' };
    
    await repertoiresRepository.prepareDelete(id).run();
    return { result: id };
  }
}
