import type { NewRepertoire } from '../../shared/schemas/repertoire-schema';

/** Repertoires : `repertoires` テーブルの永続化操作を扱う Repository */
export class RepertoiresRepository {
  constructor(private readonly db: D1Database) { }
  
  /** レパートリー登録用の文を作る */
  public prepareCreate(repertoire: NewRepertoire): D1PreparedStatement {
    return this.db
      .prepare('INSERT INTO repertoires (track_id, artist, album, title, part, proficiency, memo) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(repertoire.track_id, repertoire.artist, repertoire.album, repertoire.title, repertoire.part, repertoire.proficiency, repertoire.memo);
  }
}
