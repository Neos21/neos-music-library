import { convertToCrLf } from '../helpers/convert-to-cr-lf';

import type { Track } from '../../shared/schemas/track-schema';

/** Tracks : `tracks` テーブルの永続化操作を扱う Repository */
export class TracksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** コメントを更新し、対象が存在しない場合は `null` を返す */
  public async update(id: number, comment: Track['comment']): Promise<Pick<Track, 'id' | 'comment' | 'updated_at'> | null> {
    return await this.db
      .prepare('UPDATE tracks SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, comment, updated_at')
      .bind(comment == null ? null : convertToCrLf(comment), id)
      .first<Pick<Track, 'id' | 'comment' | 'updated_at'>>();
  }
}
