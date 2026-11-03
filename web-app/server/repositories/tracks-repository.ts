import { convertToCrLf } from '../helpers/convert-to-cr-lf';

import type { Track, TrackListItem } from '../../shared/types/track';

/** `tracks` テーブルの永続化操作を扱う Repository */
export class TracksRepository {
  constructor(private readonly db: D1Database) { }
  
  /** 楽曲一覧に必要な項目だけを取得する */
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
    return result.results ?? [];
  }
  
  /** 指定した ID の楽曲の紐付け用情報を取得する */
  public async findById(id: number): Promise<Pick<Track, 'id' | 'artist' | 'album' | 'title'> | null> {
    return await this.db.prepare('SELECT id, artist, album, title FROM tracks WHERE id = ? LIMIT 1').bind(id).first<Pick<Track, 'id' | 'artist' | 'album' | 'title'>>();
  }
  
  /** コメントを更新し、対象が存在しない場合は `null` を返す */
  public async update(id: number, comment: Track['comment']): Promise<Pick<Track, 'id' | 'comment'> | null> {  // TODO : ココ RETURNING 要るかな？要らない気がする
    return await this.db
      .prepare('UPDATE tracks SET comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, comment')
      .bind(comment == null ? null : convertToCrLf(comment), id)
      .first<Pick<Track, 'id' | 'comment'>>();
  }
}
