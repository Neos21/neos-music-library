import { RepertoireLinksRepository } from '../repositories/repertoire-links-repository';
import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { CreateRepertoire } from '../../shared/schemas/repertoire-schema';
import type { Result } from '../../shared/types/utilities/result';

/** レパートリーとリンクをまとめて登録する Service */
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
}
