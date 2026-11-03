import type { EditRepertoire } from '../../shared/types/repertoire';

/** `repertoires` テーブルの永続化操作を扱う Repository */
export class RepertoiresRepository {
  constructor(private readonly db: D1Database) { }
  
  /** レパートリーを登録する */
  public async create(repertoire: EditRepertoire): Promise<D1Result> {
    return await this.db
      .prepare('INSERT INTO repertoires (track_id, artist, album, title, part, proficiency, memo) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(repertoire.track_id, repertoire.artist, repertoire.album, repertoire.title, repertoire.part, repertoire.proficiency, repertoire.memo)
      .run();
  }
  
  /** レパートリーを更新する */
  public async update(id: number, repertoire: EditRepertoire): Promise<void> {
    await this.db
      .prepare('UPDATE repertoires SET track_id = ?, artist = ?, album = ?, title = ?, part = ?, proficiency = ?, memo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(repertoire.track_id, repertoire.artist, repertoire.album, repertoire.title, repertoire.part, repertoire.proficiency, repertoire.memo, id)
      .run();
  }
  
  /** レパートリーを削除する */
  public async delete(id: number): Promise<void> {
    await this.db.prepare('DELETE FROM repertoires WHERE id = ?').bind(id).run();
  }
}
