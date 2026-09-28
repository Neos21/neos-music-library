import type { NewRepertoireLink } from '../../shared/schemas/repertoire-link-schema';

/** `repertoire_links` テーブルの永続化操作を扱う Repository */
export class RepertoireLinksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** レパートリーに紐付くレパートリーリンクを全て削除する文を作る */
  public prepareDeleteByRepertoireId(repertoireId: number): D1PreparedStatement {
    return this.db.prepare('DELETE FROM repertoire_links WHERE repertoire_id = ?').bind(repertoireId);
  }
  
  /** レパートリーリンク登録用の文を作る・ID が `null` の場合は同一バッチで直前に登録したレパートリーに紐付ける */
  public prepareCreate(repertoireId: number | null, repertoireLink: Omit<NewRepertoireLink, 'repertoire_id'>): D1PreparedStatement {
    // レパートリーリンクの INSERT 後は `last_insert_rowid()` がレパートリーリンク自身の ID に変わるため、親テーブルの最大 ID を参照する
    return this.db
      .prepare('INSERT INTO repertoire_links (repertoire_id, type, url, title, memo) VALUES (COALESCE(?, (SELECT MAX(id) FROM repertoires)), ?, ?, ?, ?)')
      .bind(repertoireId, repertoireLink.type, repertoireLink.url, repertoireLink.title, repertoireLink.memo);
  }
}
