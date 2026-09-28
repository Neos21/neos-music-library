import type { NewRepertoire, Repertoire, UpdateRepertoire } from '../../shared/schemas/repertoire-schema';

/** `repertoires` テーブルの永続化操作を扱う Repository */
export class RepertoiresRepository {
  constructor(private readonly db: D1Database) { }
  
  /** ID に一致するレパートリーを取得する */
  public async findById(id: number): Promise<Pick<Repertoire, 'id' | 'track_id'> | null> {
    return await this.db
      .prepare('SELECT id, track_id FROM repertoires WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Pick<Repertoire, 'id' | 'track_id'>>();
  }
  
  /** レパートリー登録用の文を作る */
  public prepareCreate(repertoire: NewRepertoire): D1PreparedStatement {
    return this.db
      .prepare('INSERT INTO repertoires (track_id, artist, album, title, part, proficiency, memo) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(repertoire.track_id, repertoire.artist, repertoire.album, repertoire.title, repertoire.part, repertoire.proficiency, repertoire.memo);
  }
  
  /** 紐付くトラック ID を維持してレパートリーを更新する文を作る */
  public prepareUpdate(id: number, repertoire: UpdateRepertoire): D1PreparedStatement {
    return this.db
      .prepare('UPDATE repertoires SET artist = ?, album = ?, title = ?, part = ?, proficiency = ?, memo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(repertoire.artist, repertoire.album, repertoire.title, repertoire.part, repertoire.proficiency, repertoire.memo, id);
  }
  
  /** 未紐付けのレパートリーにトラックを紐付ける文を作る */
  public prepareLinkTrack(id: number, trackId: number): D1PreparedStatement {
    return this.db
      .prepare('UPDATE repertoires SET track_id = ? WHERE id = ? AND track_id IS NULL')
      .bind(trackId, id);
  }
  
  /** レパートリーを削除する文を作る */
  public prepareDelete(id: number): D1PreparedStatement {
    return this.db.prepare('DELETE FROM repertoires WHERE id = ?').bind(id);
  }
}
