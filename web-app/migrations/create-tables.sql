-- テーブルを新規作成する

CREATE TABLE tracks (  -- iTunes ライブラリをマスターとした楽曲情報
  id            INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- D1 における永続的なトラック ID
  
  artist        TEXT,               -- iTunes ライブラリよりインポートしたアーティスト名 (iTunes 上で空欄時は `null` 扱いなので `NULL` を許容する)
  album         TEXT,               -- iTunes ライブラリよりインポートしたアルバム名 (iTunes 上で空欄時は `null` 扱いなので `NULL` を許容する)
  track_number  INTEGER  NOT NULL,  -- iTunes ライブラリよりインポートしたトラック番号 (iTunes 上で空欄時は `0` 扱いなので `NULL` は許容しない)
  title         TEXT     NOT NULL,  -- iTunes ライブラリよりインポートした曲名 (iTunes 上では空欄に更新できないので `NULL` は許容しない)
  
  persistent_id_high  INTEGER  NOT NULL,  -- iTunes ライブラリの Persistent ID High
  persistent_id_low   INTEGER  NOT NULL,  -- iTunes ライブラリの Persistent ID Low
  
  comment             TEXT,  -- Web アプリで記入したコメント (`imported_comment` に合わせて NULL 許容する)
  imported_comment    TEXT,  -- iTunes ライブラリよりインポートしたコメント (iTunes 上では空欄時は `null` 扱いなので `NULL` を許容する)
  imported_at         TEXT,  -- iTunes ライブラリから D1 にインポートした日時
  comment_updated_at  TEXT,  -- Web アプリでコメントを記入した最終日時
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時 (初回の INSERT 時のみ値を入れて以降は不変)
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時 (Web アプリ上・ローカルからの操作時に関係なく全ての UPDATE 時に更新する)
);

CREATE TABLE repertoires (  -- レパートリー
  id        INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- レパートリー ID
  
  track_id  INTEGER,  -- `tracks.id` での紐付けが可能な場合のみ値を入れる・紐付けがない場合は `NULL`
  
  artist  TEXT  NOT NULL,  -- アーティスト名
  album   TEXT  NOT NULL,  -- アルバム名 (未入力は許容せず「■」と入力させる)
  title   TEXT  NOT NULL,  -- 曲名
  
  part         TEXT  NOT NULL,  -- パート (`guitar`・`bass`・`vocal`・`keyboard` など)
  proficiency  TEXT,            -- 習熟度 (`planned`・`practicing`・`playable`・`mastered` など)
  memo         TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時
);

CREATE TABLE repertoire_links (  -- レパートリーに紐付く URL
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  repertoire_id  INTEGER  NOT NULL,                    -- 紐付けるレパートリー ID
  
  type   TEXT  NOT NULL,  -- リンク種別 (`tab`・`lesson`・`reference`・`my_video`・`other` など)
  url    TEXT  NOT NULL,  -- URL
  title  TEXT,            -- タイトル
  memo   TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時
);
