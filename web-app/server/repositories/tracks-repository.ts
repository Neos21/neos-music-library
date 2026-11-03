import { convertToCrLf } from '../helpers/convert-to-cr-lf';

import type { Track, TrackListItem } from '../../shared/types/track';

/** `tracks` テーブルの永続化操作を扱う Repository */
export class TracksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 楽曲一覧を取得する */
  public async findAll(): Promise<Array<TrackListItem>> {
    const result = await this.db
      .prepare(`
        SELECT
          id, artist, album, track_number, title, comment
        FROM tracks
        ORDER BY
          artist        ASC NULLS FIRST,
          album         ASC NULLS FIRST,
          track_number  ASC,
          title         ASC,
          id            ASC
      `)
      .all<TrackListItem>();
    return result.results;
  }
  
  /** 指定した ID の楽曲を取得する (存在確認用) */
  public async findById(id: number): Promise<Pick<Track, 'id'> | null> {
    return await this.db
      .prepare('SELECT id FROM tracks WHERE id = ? LIMIT 1')
      .bind(id)
      .first<Pick<Track, 'id'>>();
  }
  
  /** コメントを更新する */
  public async update(id: number, comment: Track['comment']): Promise<void> {
    await this.db
      .prepare('UPDATE tracks SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(comment == null ? null : convertToCrLf(comment), id)
      .run();
  }
}
