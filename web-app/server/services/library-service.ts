import type { RepertoireLink } from '../../shared/schemas/repertoire-link-schema';
import type { Repertoire } from '../../shared/schemas/repertoire-schema';
import type { Track } from '../../shared/schemas/track-schema';
import type { LibraryTrack } from '../../shared/types/app/library-track';

/** SQL で取得時の `AS` カラム名に合わせてアンダースコアで Prefix を繋げるための型 */
type Prefixed<T, Prefix extends string> = {
  [K in keyof T as `${Prefix}_${K & string}`]: T[K];
};

/** `LEFT JOIN` で結合するレコードがなかった場合に `NULL` になるので `NULL` を許容するよう調整した型 */
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

/** SQL で取得できる生のレコードを示す型 */
type LibraryRow =
  Prefixed<Omit<Track, 'persistent_id_high' | 'persistent_id_low'>                      , 'track'> &
  Prefixed<Nullable<Omit<Repertoire, 'created_at' | 'updated_at'>>                      , 'repertoire'> &
  Prefixed<Nullable<Omit<RepertoireLink, 'repertoire_id' | 'created_at' | 'updated_at'>>, 'repertoire_link'>;

/** ライブラリ情報を取得するためのサービス */
export class LibraryService {
  constructor(private readonly db: D1Database) { }
  
  /** 一覧取得する */
  public async findAll(): Promise<Array<LibraryTrack>> {
    const result = await this.db
      .prepare(`
        SELECT
          tracks.id                AS track_id,
          tracks.artist            AS track_artist,
          tracks.album             AS track_album,
          tracks.track_number      AS track_track_number,
          tracks.title             AS track_title,
          tracks.comment           AS track_comment,
          tracks.imported_comment  AS track_imported_comment,
          tracks.updated_at        AS track_updated_at,
          
          repertoires.id           AS repertoire_id,
          repertoires.track_id     AS repertoire_track_id,
          repertoires.artist       AS repertoire_artist,
          repertoires.album        AS repertoire_album,
          repertoires.title        AS repertoire_title,
          repertoires.part         AS repertoire_part,
          repertoires.proficiency  AS repertoire_proficiency,
          repertoires.memo         AS repertoire_memo,
          
          repertoire_links.id     AS repertoire_link_id,
          repertoire_links.type   AS repertoire_link_type,
          repertoire_links.url    AS repertoire_link_url,
          repertoire_links.title  AS repertoire_link_title,
          repertoire_links.memo   AS repertoire_link_memo
        FROM tracks
          LEFT JOIN repertoires
            ON repertoires.track_id = tracks.id
          LEFT JOIN repertoire_links
            ON repertoire_links.repertoire_id = repertoires.id
        ORDER BY
          tracks.artist        ASC  NULLS FIRST,
          tracks.album         ASC  NULLS FIRST,
          tracks.track_number  ASC,
          tracks.title         ASC,
          tracks.id            ASC,
          repertoires.id       ASC,
          repertoire_links.id  ASC
      `)
      .all<LibraryRow>();
    
    const libraryRows = result.results;
    if(libraryRows == null || libraryRows.length === 0) return [];
    
    const libraryTracksMap = new Map<number, LibraryTrack>();
    for(const libraryRow of libraryRows) {
      let track = libraryTracksMap.get(libraryRow.track_id);
      if(track == null) {
        track = {
          id              : libraryRow.track_id,
          artist          : libraryRow.track_artist,
          album           : libraryRow.track_album,
          track_number    : libraryRow.track_track_number,
          title           : libraryRow.track_title,
          comment         : libraryRow.track_comment,
          imported_comment: libraryRow.track_imported_comment,
          updated_at      : libraryRow.track_updated_at,
          repertoires     : []
        };
        libraryTracksMap.set(libraryRow.track_id, track);
      }
      
      if(libraryRow.repertoire_id === null) continue;
      
      let repertoire = track.repertoires.find(repertoire => repertoire.id === libraryRow.repertoire_id);
      if(repertoire == null) {
        repertoire = {
          id              : libraryRow.repertoire_id,
          track_id        : libraryRow.repertoire_track_id,
          artist          : libraryRow.repertoire_artist!,
          album           : libraryRow.repertoire_album!,
          title           : libraryRow.repertoire_title!,
          part            : libraryRow.repertoire_part!,
          proficiency     : libraryRow.repertoire_proficiency,
          memo            : libraryRow.repertoire_memo,
          repertoire_links: []
        };
        track.repertoires.push(repertoire);
      }
      
      if(libraryRow.repertoire_link_id != null) {
        repertoire.repertoire_links.push({
          id   : libraryRow.repertoire_link_id,
          type : libraryRow.repertoire_link_type!,
          url  : libraryRow.repertoire_link_url!,
          title: libraryRow.repertoire_link_title!,
          memo : libraryRow.repertoire_link_memo
        });
      }
    }
    
    const libraryTracks = [...libraryTracksMap.values()];
    return libraryTracks;
  }
}
