-- テーブルを新規作成する

CREATE TABLE tracks (  -- iTunes ライブラリをマスターとした楽曲情報
  id            INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- D1 における永続的な楽曲 ID
  
  artist        TEXT     NOT NULL,  -- iTunes ライブラリよりインポートしたアーティスト名
  album         TEXT     NOT NULL,  -- iTunes ライブラリよりインポートしたアルバム名 (アルバムがない場合も「■」で iTunes 管理しているため NOT NULL で良い)
  track_number  INTEGER,            -- iTunes ライブラリよりインポートしたトラック番号
  title         TEXT     NOT NULL,  -- iTunes ライブラリよりインポートした曲名
  
  persistent_id_high  INTEGER  NOT NULL,  -- iTunes ライブラリの Persistent ID High
  persistent_id_low   INTEGER  NOT NULL,  -- iTunes ライブラリの Persistent ID Low
  
  comment             TEXT,  -- Web アプリで記入したコメント
  imported_comment    TEXT,  -- iTunes ライブラリよりインポートしたコメント
  imported_at         TEXT,  -- iTunes ライブラリから D1 にインポートした日時
  comment_updated_at  TEXT,  -- Web アプリでコメントを記入した最終日時
  comment_synced_at   TEXT,  -- Web アプリ上のコメントと iTunes ライブラリのコメントを同期した最終日時
  
  comment_sync_status             TEXT  NOT NULL  DEFAULT 'synced',  -- コメントの同期状態 (同期済状態なら `synced`)
  comment_sync_status_updated_at  TEXT,                              -- コメントの同期状態の最終更新日時
  
  rebind_status             TEXT  NOT NULL  DEFAULT 'bound',  -- Rebind 処理時の同期状態 (処理が不要な通常時は `bound`)
  rebind_status_updated_at  TEXT,                             -- Rebind 処理時の同期状態の最終更新日時
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時
);

CREATE TABLE repertoires (  -- レパートリー
  id        INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- レパートリー ID
  
  track_id  INTEGER,  -- `tracks.id` での紐付けが可能な場合のみ値を入れる・紐付けがない場合は NULL
  
  artist  TEXT  NOT NULL,  -- アーティスト名
  album   TEXT  NOT NULL,  -- アルバム名 (未入力は許容せず「■」と入力させる)
  title   TEXT  NOT NULL,  -- 曲名
  
  part         TEXT  NOT NULL,  -- パート
  proficiency  TEXT,            -- 習熟度
  memo         TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時
);

CREATE TABLE repertoire_links (  -- レパートリーに紐付く URL
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  repertoire_id  INTEGER  NOT NULL,                    -- 紐付けるレパートリー ID
  
  type   TEXT  NOT NULL,  -- リンク種別
  url    TEXT  NOT NULL,  -- URL
  title  TEXT,            -- タイトル
  memo   TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL  DEFAULT CURRENT_TIMESTAMP   -- レコード最終更新日時
);
