import { RepertoireLinksRepository } from '../repositories/repertoire-links-repository';
import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { CreateRepertoire, UpdateRepertoire } from '../../shared/schemas/repertoire-schema';
import type { Result } from '../../shared/types/utilities/result';

/** レパートリーとリンクの登録・更新・削除を扱う Service */
export class RepertoiresService {
  constructor(private readonly db: D1Database) { }
  
  /** トラックの存在を確認し、レパートリーとリンクを一括登録する */
  public async create(repertoire: CreateRepertoire): Promise<Result<number>> {
    if(repertoire.track_id != null) {
      const track = await new TracksRepository(this.db).findById(repertoire.track_id);
      if(track == null) return { error: '紐付くトラックが存在しません' };
    }
    
    const repertoireStatement = new RepertoiresRepository(this.db).prepareCreate(repertoire);
    const repertoireLinksRepository = new RepertoireLinksRepository(this.db);
    const repertoireLinkStatements = repertoire.repertoire_links.map(repertoireLink => repertoireLinksRepository.prepareCreate(null, repertoireLink));
    const results = await this.db.batch([repertoireStatement, ...repertoireLinkStatements]);
    return { result: results[0]!.meta.last_row_id };
  }
  
  /** レパートリーを更新し、リンクを入力内容で入れ替える */
  public async update(id: number, repertoire: UpdateRepertoire): Promise<Result<number>> {
    const repertoiresRepository = new RepertoiresRepository(this.db);
    if(await repertoiresRepository.findById(id) == null) return { error: 'レパートリーが存在しません' };
    
    const repertoireLinksRepository = new RepertoireLinksRepository(this.db);
    await this.db.batch([
      repertoiresRepository.prepareUpdate(id, repertoire),
      repertoireLinksRepository.prepareDeleteByRepertoireId(id),
      ...repertoire.repertoire_links.map(repertoireLink => repertoireLinksRepository.prepareCreate(id, repertoireLink))
    ]);
    return { result: id };
  }
  
  /** レパートリーと紐付くリンクを削除する */
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
