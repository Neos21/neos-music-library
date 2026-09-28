import type { NewRepertoireLink } from '../../shared/schemas/repertoire-link-schema';

/** RepertoireLinks : `repertoire_links` テーブルの永続化操作を扱う Repository */
export class RepertoireLinksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** リンク登録用の文を作る・ID が `null` の場合は同一バッチで直前に登録したレパートリーに紐付ける */
  public prepareCreate(repertoireId: number | null, repertoireLink: Omit<NewRepertoireLink, 'repertoire_id'>): D1PreparedStatement {
    // リンクの INSERT 後は last_insert_rowid() がリンク自身の ID に変わるため、親テーブルの最大 ID を参照する
    return this.db
      .prepare('INSERT INTO repertoire_links (repertoire_id, type, url, title, memo) VALUES (COALESCE(?, (SELECT MAX(id) FROM repertoires)), ?, ?, ?, ?)')
      .bind(repertoireId, repertoireLink.type, repertoireLink.url, repertoireLink.title, repertoireLink.memo);
  }
}
