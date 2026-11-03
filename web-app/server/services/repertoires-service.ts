import { RepertoiresRepository } from '../repositories/repertoires-repository';
import { TracksRepository } from '../repositories/tracks-repository';

import type { CreateRepertoire, UpdateRepertoire } from '../../shared/schemas/repertoire-schema';
import type { RepertoireWithoutTrack } from '../../shared/types/app/library-track';
import type { Result } from '../../shared/types/utilities/result';

/** レパートリーの取得と楽曲の存在確認を伴う登録・更新・削除を扱う Service */
export class RepertoiresService {
  constructor(private readonly db: D1Database) { }
  
  /** 楽曲に紐付かないレパートリーを一覧取得する */
  public async findWithoutTrack(): Promise<Array<RepertoireWithoutTrack>> {
    return await new RepertoiresRepository(this.db).findWithoutTrack();
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
