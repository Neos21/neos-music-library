import { convertToCrLf } from '../helpers/convert-to-cr-lf';

import type { Track } from '../../shared/schemas/track-schema';

/** `tracks` テーブルの永続化操作を扱う Repository */
export class TracksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 指定した ID の楽曲が存在するか確認する */
  public async findById(id: number): Promise<Pick<Track, 'id'> | null> {
    return await this.db.prepare('SELECT id FROM tracks WHERE id = ? LIMIT 1').bind(id).first<Pick<Track, 'id'>>();
  }
  
  /** コメントを更新し、対象が存在しない場合は `null` を返す */
  public async update(id: number, comment: Track['comment']): Promise<Pick<Track, 'id' | 'comment'> | null> {
    return await this.db
      .prepare('UPDATE tracks SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, comment')
      .bind(comment == null ? null : convertToCrLf(comment), id)
      .first<Pick<Track, 'id' | 'comment'>>();
  }
}
