import { RepertoireLinksRepository } from '../repositories/repertoire-links-repository';
import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { RepertoireLink } from '../../shared/schemas/repertoire-link-schema';
import type { CreateRepertoire, Repertoire, UpdateRepertoire } from '../../shared/schemas/repertoire-schema';
import type { RepertoireWithoutTrack } from '../../shared/types/app/library-track';
import type { Result } from '../../shared/types/utilities/result';

/** 楽曲に紐付かないレパートリーとレパートリーリンクを結合した取得行 */
type RepertoireWithoutTrackRow = Omit<Repertoire, 'track_id' | 'created_at' | 'updated_at'> & {
  repertoire_link_id   : number | null;
  repertoire_link_type : RepertoireLink['type'] | null;
  repertoire_link_url  : string | null;
  repertoire_link_title: string | null;
  repertoire_link_memo : string | null;
};

/** レパートリーとレパートリーレパートリーリンクの登録・更新・削除を扱う Service */
export class RepertoiresService {
  constructor(private readonly db: D1Database) { }
  
  /** 楽曲に紐付かないレパートリーとリンクを一覧取得する */
  public async findWithoutTrack(): Promise<Array<RepertoireWithoutTrack>> {
    const result = await this.db
      .prepare(`
        SELECT
          repertoires.id           AS id,
          repertoires.artist       AS artist,
          repertoires.album        AS album,
          repertoires.title        AS title,
          repertoires.part         AS part,
          repertoires.proficiency  AS proficiency,
          repertoires.memo         AS memo,
          
          repertoire_links.id     AS repertoire_link_id,
          repertoire_links.type   AS repertoire_link_type,
          repertoire_links.url    AS repertoire_link_url,
          repertoire_links.title  AS repertoire_link_title,
          repertoire_links.memo   AS repertoire_link_memo
        FROM repertoires
          LEFT JOIN repertoire_links
            ON repertoire_links.repertoire_id = repertoires.id
        WHERE repertoires.track_id IS NULL
        ORDER BY
          repertoires.artist   ASC,
          repertoires.album    ASC,
          repertoires.title    ASC,
          repertoires.id       ASC,
          repertoire_links.id  ASC
      `)
      .all<RepertoireWithoutTrackRow>();
    
    const repertoiresMap = new Map<number, RepertoireWithoutTrack>();
    for(const row of result.results ?? []) {
      let repertoire = repertoiresMap.get(row.id);
      if(repertoire == null) {
        repertoire = {
          id              : row.id,
          track_id        : null,
          artist          : row.artist,
          album           : row.album,
          title           : row.title,
          part            : row.part,
          proficiency     : row.proficiency,
          memo            : row.memo,
          repertoire_links: []
        };
        repertoiresMap.set(row.id, repertoire);
      }
      
      if(row.repertoire_link_id != null) {
        repertoire.repertoire_links.push({
          id   : row.repertoire_link_id,
          type : row.repertoire_link_type!,
          url  : row.repertoire_link_url!,
          title: row.repertoire_link_title!,
          memo : row.repertoire_link_memo
        });
      }
    }
    
    return [...repertoiresMap.values()];
  }
  
  /** 楽曲の存在を確認し、レパートリーとレパートリーリンクを一括登録する */
  public async create(repertoire: CreateRepertoire): Promise<Result<number>> {
    if(repertoire.track_id != null) {
      const track = await new TracksRepository(this.db).findById(repertoire.track_id);
      if(track == null) return { error: '紐付く楽曲が存在しません' };
    }
    
    const repertoireStatement = new RepertoiresRepository(this.db).prepareCreate(repertoire);
    const repertoireLinksRepository = new RepertoireLinksRepository(this.db);
    const repertoireLinkStatements = repertoire.repertoire_links.map(repertoireLink => repertoireLinksRepository.prepareCreate(null, repertoireLink));
    const results = await this.db.batch([repertoireStatement, ...repertoireLinkStatements]);
    return { result: results[0]!.meta.last_row_id };
  }
  
  /** レパートリーを更新し、レパートリーリンクを入力内容で入れ替える */
  public async update(id: number, repertoire: UpdateRepertoire): Promise<Result<number>> {
    const repertoiresRepository = new RepertoiresRepository(this.db);
    const existingRepertoire = await repertoiresRepository.findById(id);
    if(existingRepertoire == null) return { error: 'レパートリーが存在しません' };
    if(repertoire.track_id !== undefined) {
      if(repertoire.track_id == null) return { error: '紐付くトラック ID が不正です' };
      if(existingRepertoire.track_id != null) return { error: '紐付く楽曲は変更できません' };
      if(await new TracksRepository(this.db).findById(repertoire.track_id) == null) return { error: '紐付く楽曲が存在しません' };
    }
    
    const repertoireLinksRepository = new RepertoireLinksRepository(this.db);
    await this.db.batch([
      repertoiresRepository.prepareUpdate(id, repertoire),
      ...(repertoire.track_id == null ? [] : [repertoiresRepository.prepareLinkTrack(id, repertoire.track_id)]),
      repertoireLinksRepository.prepareDeleteByRepertoireId(id),
      ...repertoire.repertoire_links.map(repertoireLink => repertoireLinksRepository.prepareCreate(id, repertoireLink))
    ]);
    return { result: id };
  }
  
  /** レパートリーと紐付くレパートリーリンクを削除する */
  public async delete(id: number): Promise<Result<number>> {
    const repertoiresRepository = new RepertoiresRepository(this.db);
    if(await repertoiresRepository.findById(id) == null) return { error: 'レパートリーが存在しません' };
    
    const repertoireLinksRepository = new RepertoireLinksRepository(this.db);
    await this.db.batch([
      repertoireLinksRepository.prepareDeleteByRepertoireId(id),
      repertoiresRepository.prepareDelete(id)
    ]);
    return { result: id };
  }
}
