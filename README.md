# Neo's Music Library


## 概要

Windows iTunes のライブラリ情報を Cloudflare D1 に同期し、Web アプリ上で以下を管理する個人用アプリ。

- 楽曲情報 (アーティスト名・アルバム名・トラック番号・曲名)
    - コメント (MP3 ファイルに書き込む)
- ギター・ベース・ボーカル・キーボード等のレパートリー
    - 習熟度
    - 参考 URL
    - 自分の演奏動画 URL

基本思想として、iTunes ライブラリを楽曲情報の正・マスターとする。

Web アプリ側は iTunes の代替ライブラリ管理ツールにはせず、iTunes に存在する楽曲へ付帯情報を追加する用途を中心とする。

ただし、レパートリー情報については「現在 iTunes に MP3 を持っているか」と独立して保持できるようにする。


## 全体構成

```
Windows PC
└ iTunes アプリ
   └ MP3 ファイル
↑ ↓
ローカル同期スクリプト
  - MP3 タグの更新
  - D1 REST API を用いた D1 の CRUD
  - D1 と iTunes ライブラリの Diff・マージ・Rebind (ライブラリ再構築時の操作)

↓

Cloudflare D1

↓

Cloudflare Workers : Hono + React Router Web アプリ
```


## 役割分担

### iTunes

楽曲情報のマスター。

以下のような情報は、原則として iTunes 側を正とする。

- アーティスト名
- アルバム名
- トラック番号
- 曲名
- Persistent ID High
- Persistent ID Low
- ファイルパス
- iTunes 上で編集されたコメント

Web アプリ側からアーティスト・アルバム・曲名等を自由編集する機能は持たせない。

### Web アプリ

主に「楽曲に付加する情報」を管理する。

- コメント
- ギター等のレパートリー
    - 参考 URL
    - 自分の演奏 URL

Web アプリは iTunes COM や MP3 ファイルの存在を意識しない。D1 のみを操作する。

### ローカル同期スクリプト

iTunes・MP3 ファイル・D1 間の橋渡しを担当する。

今回のシステムでは、Web アプリよりこちらの方が同期ロジックを多く持つ。

- 主な責務 :
    - iTunes ライブラリの全件取得
    - D1 上のデータの全件取得
    - 通常同期の差分判定
    - D1 への INSERT・UPDATE・DELETE 文の発行と実行
    - Web アプリで登録されたコメントの MP3 ファイルへの反映
    - インポート時のコメント・Web アプリで登録されたコメント・MP3 ファイルのコメントとの 3-Way Merge およびコンフリクト検出
    - iTunes ライブラリ再構築時の Rebind (Persistent ID が変化することによる紐付け直し作業)
    - 手動判断結果から SQL の生成・実行
    - 操作ログ生成

D1 の操作は Cloudflare D1 REST API を利用する。Wrangler CLI への依存は必須としない。


## 基本運用方針 : D1 を手作業で直接 UPDATE しない

手動作業が必要な場合でも、人間が行うのは「どの値を採用するか」「どの曲同士を紐付けるか」の判断までとする。

その判断結果を JSON 等に記録し、

```
人間による判断
↓
ローカルスクリプト
↓
SQL 生成
↓
D1 API をコールして更新
```

という流れを守る。

これにより、

- 何を変更したか
- どこまで処理済みか
- 何が未処理か

を追跡しやすくする。


## 通常の iTunes → D1 同期

毎回以下の2集合を比較する。

```
現在の iTunes ライブラリ全件
+
現在の D1 にある tracks テーブル全件
```

ローカルに「前回エクスポート結果」を恒久保存する必要はない。D1 側が前回までの同期状態を表す。


## 差分判定

通常時は Persistent ID を識別キーとして使用する。

```
iTunes に存在し、D1 に存在しない
→ INSERT

iTunes に存在し、D1 にも同じ Persistent ID が存在する
→ 内容比較
→ 差分があれば UPDATE

D1 に存在し、iTunes に同じ Persistent ID が存在しない
→ DELETE 候補
```

- 比較対象例 :
    - アーティスト名
    - アルバム名
    - トラック番号
    - 曲名


## 曲削除

通常同期では、

```
D1 に存在する Persistent ID
-
現在 iTunes に存在する Persistent ID
```

を削除候補とする。前回エクスポート JSON との比較は不要。

ただし、削除対象は SQL 実行前にログへ出力する。

- 例 :

```json
{
  "deleted": [
    {
      "track_id": 123,
      "persistent_id_high": "01234567",
      "persistent_id_low": "89ABCDEF",
      "artist": "Example Artist",
      "album": "Example Album",
      "title": "Example Song"
    }
  ]
}
```

レパートリー等から参照されている場合は、必要に応じて `track_id` を `NULL` にする SQL も同期スクリプト側で生成する。


## コメント同期

コメントは双方向同期対象。

以下の3値を使って 3-Way Merge する。

```
BASE
= D1.imported_comment
= 前回 iTunes から観測したコメント

WEB
= D1.comment
= Web アプリ上で現在採用しているコメント

MP3
= 今回 MP3 ファイルから取得したコメント
```

### パターン

- 変更なし

```
BASE = A
WEB  = A
MP3  = A
```

→ 何もしない。

### Web のみ変更

```
BASE = A
WEB  = B
MP3  = A
```

→ B を MP3 に書き込む。その後 iTunes COM の `UpdateInfoFromFile()` を実行し iTunes ライブラリにも反映させる。

### iTunes のみ変更

```
BASE = A
WEB  = A
MP3  = C
```

→ D1 のコメントを C に更新する。

### Web と iTunes が同じ値になった

```
BASE = A
WEB  = B
MP3  = B
```

→ 競合ではない。B を採用して同期済み状態に収束させる。

### Web と iTunes の両方が別々に変更

```
BASE = A
WEB  = B
MP3  = C
```

→ コンフリクト。自動解決せず、人間が以下のいずれかを判断する。

- Web 側を採用
- MP3 側を採用
- 手動で新しい値を作る

判断結果は JSON 等へ記録し、D1 への UPDATE はスクリプト生成結果のみを利用する。


## コメント同期状態

時刻だけから状態を推測せず、明示的なステータスを持つ。

- 例 :

```
synced
web_changed
conflict
resolved_pending_sync
```

- 主な遷移 :

```
synced
↓ Web アプリ上でコメントを更新
web_changed
↓ MP3 ファイルへの反映成功
synced
```

競合 :

```
conflict
↓ 人間が採用値を決定
resolved_pending_sync
↓ MP3 ファイル・iTunes ライブラリへの反映成功
synced
```

`comment_updated_at` や `imported_at` は補助情報として利用し、コンフリクト判定そのものは値の比較で行う。


## ライブラリ再構築

iTunes ライブラリを再構築すると Persistent ID が変更される可能性がある。この場合、通常同期とは別の「Rebind モード」を実行する。目的は、

```
既存 tracks.id
↓
新しい iTunes ライブラリエントリ
```

の対応関係を再構築すること。

`tracks.id` は D1 内部の永続 Surrogate Key として維持するが、楽曲情報の正はあくまで iTunes。


## Rebind 処理

以下を取得する。

```
D1 の tracks テーブル全件 (旧 iTunes ライブラリ相当の情報)
+
新 iTunes ライブラリ全件
```

Persistent ID は識別に使わない。

まず論理情報で完全一致を探す。

- 条件 :
    - アーティスト名
    - アルバム名
    - 曲名

### 初期分類

すべてのレコードを、

```
MATCHED
UNMATCHED_OLD
UNMATCHED_NEW
```

に分類する。

#### MATCHED

D1 と新 iTunes が一意に一致。

```
旧 tracks.id を維持
↓
新 Persistent ID・メタデータを UPDATE
```

#### UNMATCHED_NEW

新 iTunes ライブラリに存在するが D1 に一致するデータがない場合。

- 可能性 :
    - 本当に新曲
    - 既存曲だがメタデータが変更されており条件に合致しなかった

即 INSERT にはしない。

#### UNMATCHED_OLD

D1 に存在するが新 iTunes ライブラリに一致するデータがない場合。

- 可能性 :
    - iTunes から削除された楽曲
    - メタデータが変更されており条件に合致しなかった既存曲

即 DELETE にはしない。

### Rebind 候補判定

`UNMATCHED_OLD` と `UNMATCHED_NEW` の間で候補を探す。

- 例 :
    - アーティスト名一致
    - 曲名一致
    - アルバム名のみ不一致

など。

候補が十分明確なら自動候補として提示する。

曖昧なものは人間が判断する。

- 判断例 :

```
same_track
new_track
deleted_track
unresolved
```

### Rebind の確定

人間による判定後、

```
同一曲
→ 既存 tracks.id を UPDATE

新曲
→ INSERT

削除曲
→ DELETE
```

とする。

INSERT・DELETE は、Rebind 候補処理が終わった後の残り物として確定する。

### Rebind の整合性チェック

ライブラリ再構築時は、全レコードが最終的に何らかの分類に入ったことを確認する。

- 例 :

```
D1 tracks    : 8,032

Rebind 成功  : 7,980
DELETE       :    52
未解決       :     0
```

```
新 iTunes    : 8,041

Rebind 成功  : 7,980
INSERT       :    61
未解決       :     0
```

- 確認 :

```
7980 + 52 = 8032
7980 + 61 = 8041
```

未解決が1件でも残る場合は、原則として一括適用しない。


## 手動作業と状態管理

コメント競合や Rebind 時の手動整理には手間がかかる場合がある。そこで、作業進捗を保持しておくため `tracks` に現在の処理状態を持つ。

人間が直接 `tracks.comment` や Persistent ID を UPDATE することは禁止し、

```
未解決一覧
↓
人間が方針を決定
↓
スクリプトが検証
↓
SQL・API リクエスト生成
↓
D1 に適用
↓
Status 更新
```

というフローに統一する。


## テーブル定義案

### `tracks` テーブル

```sql
CREATE TABLE tracks (
  id            INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- D1 における永続的な楽曲 ID
  
  artist        TEXT     NOT NULL,  -- iTunes ライブラリよりインポートしたアーティスト名
  album         TEXT     NOT NULL,  -- iTunes ライブラリよりインポートしたアルバム名 (アルバムがない場合も「■」で iTunes 管理しているため NOT NULL で良い)
  track_number  INTEGER,            -- iTunes ライブラリよりインポートしたトラック番号
  title         TEXT     NOT NULL,  -- iTunes ライブラリよりインポートした曲名
  
  persistent_id_high  INTEGER,  -- iTunes ライブラリの Persistent ID High
  persistent_id_low   INTEGER,  -- iTunes ライブラリの Persistent ID Low
  full_path           TEXT,     -- iTunes ライブラリよりインポートした時点でのファイルフルパス
  
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
```

#### Rebind Status の例

```
bound
rebind_required
rebind_resolved
delete_confirmed
```

- 通常時 : `bound`
- ライブラリ再構築で確認が必要 : `rebind_required`
- 人間または自動判定で対応先確定 : `rebind_resolved`

### `repertoires` テーブル

`tracks` は現在の iTunes ライブラリを表す。一方、レパートリーは iTunes 上の MP3 の存在とは独立して管理する。

- 以前ギターをコピーしたが MP3 ファイルは削除済み (iTunes ライブラリにない)
- MP3 ファイルは持っていないが今後コピーしたい楽曲
- カラオケで歌える
- ギターだけ弾ける
- 同じ曲をベースでもコピーした

これらを表現できるようにする。

ギター・ベース・ボーカル・キーボード・ドラムの楽器を別テーブルにせず、共通テーブルに統合する。

```sql
CREATE TABLE repertoires (
  id        INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- レパートリー ID
  
  track_id  INTEGER,  -- `tracks.id` での紐付けが可能な場合のみ値を入れる・紐付けがない場合は NULL
  
  artist  TEXT  NOT NULL,  -- アーティスト名
  album   TEXT  NOT NULL,  -- アルバム名 (未入力は許容せず「■」と入力させる)
  title   TEXT  NOT NULL,  -- 曲名
  
  part         TEXT  NOT NULL,  -- パート
  proficiency  TEXT,            -- 習熟度
  memo         TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL   -- レコード最終更新日時
);
```

`track_id` は Nullable。D1 の `FOREIGN KEY` 制約には依存しない。

#### Part (パート)

- 内部値例 :

```
guitar
bass
vocal
keyboard
drums
```

画面上では、

```
ギター
ベース
ボーカル
キーボード
ドラム
```

等に変換表示する。

同じ1曲について、

```
guitar
vocal
bass
```

を別レコードで管理できる。

#### `repertoires` と `tracks` の関係

`track_id` が存在する場合は、表示時に `tracks` の楽曲情報を優先する。

```
track_id あり
→ tracks.artist・album・title を優先

track_id なし
→ repertoires.artist・album・title を利用
```

ただし `track_id` が存在する場合でも、

```
artist
album
title
```

は `repertoires` 側にも保存しておく。これは登録時のスナップショット、フォールバック情報として利用する。

#### `tracks` 削除時

iTunes から曲が削除された場合でも `repertoires` テーブルの情報は残す。

必要に応じて同期スクリプトが、

```sql
UPDATE repertoires
  SET track_id = NULL
  WHERE track_id = ?;
```

を生成する。

後日同じ MP3 を追加した場合は `repertoires.track_id` を手動または候補判定で再設定できるようにする。

#### Proficiency (習熟度)

- 未着手の楽曲一覧
- 練習中の楽曲一覧
- 演奏可能な楽曲一覧
- 習得済みの楽曲一覧

などを検索・絞り込みしやすくするため構造化しておく。

- 候補例 :

```
planned
practicing
playable
mastered
```

### `repertoire_links` テーブル

1曲・1パートに複数 URL を持てるよう、URL は別テーブル化する。

```sql
CREATE TABLE repertoire_links (
  id             INTEGER  PRIMARY KEY  AUTOINCREMENT,  -- ID
  repertoire_id  INTEGER  NOT NULL,                    -- 紐付けるレパートリー ID
  
  type   TEXT  NOT NULL,  -- リンク種別
  url    TEXT  NOT NULL,  -- URL
  title  TEXT,            -- タイトル
  memo   TEXT,            -- 自由メモ
  
  created_at  TEXT  NOT NULL,  -- レコード初回作成日時
  updated_at  TEXT  NOT NULL   -- レコード最終更新日時
);
```

#### Type

- 例 :

```
tab       : タブ譜ページ
lesson    : 解説ページ・レッスン動画
reference : 本人演奏・ライブ映像
my_video  : 自分が投稿した演奏動画
other     : その他
```


## ローカル同期ログ

同期処理では操作前後を JSON 等で保存する。

- 例 :

```
sync-runs/
└ 2026-09-09-22-00-00/
   ├ summary.json
   ├ inserted.json
   ├ updated.json
   ├ deleted.json
   ├ comments-to-itunes.json
   ├ comments-from-itunes.json
   ├ conflicts.json
   └ rebinds.json
```

変更ログは Before・After を残す。

- 例 :

```json
{
  "track_id": 123,
  "changes": {
    "album": {
      "before": "Big Life",
      "after": "Big Life (Remastered)"
    }
  }
}
```

- コメント競合 :

```json
{
  "track_id": 123,
  "base": "A",
  "web": "B",
  "mp3": "C",
  "resolution": null
}
```


## 現時点の設計原則まとめ

- iTunes ライブラリを楽曲情報のマスターとする
- `tracks.id` は D1 内部の永続 Surrogate Key としてのみ扱う
- Persistent ID は通常同期時の強い識別子として利用する
- iTunes ライブラリ再構築時だけ Persistent ID を捨て、Rebind 処理を行う
- Web アプリは MP3 ファイル・iTunes ライブラリを意識しない
- 同期・マージ・Rebind は処理ローカルスクリプトの責務とする
- D1 を人間が直接 UPDATE しない
- 人間は判断のみ行い、DB 操作は必ずスクリプト経由にする
- コメント競合は 3-Way Merge する
- 手動作業の途中状態は `tracks` の Status で管理する
- レパートリー情報は iTunes ライブラリでの MP3 ファイル所有状態から独立させる
- `repertoires` 側にもアーティスト名・アルバム名・曲名のスナップショットを保持する
- `repertoires.track_id` は Nullable な補助リンクとして扱う
- ギター・ベース・ボーカル等は `repertoires.part` で統合する
- 複数 URL は `repertoire_links` テーブルに分離する


## ドキュメント

AI エージェントを用いた開発を考慮してドキュメントを分割配置している。

| ファイル                                       | 役割                                                |
|------------------------------------------------|-----------------------------------------------------|
| [local-sync/README.md](./local-sync/README.md) | Local Sync 部分のドキュメント                       |
| [web-app/README.md](./web-app/README.md)       | Web App 部分のドキュメント                          |
| [docs/README.md](./docs/README.md)             | 詳細ドキュメントの配置方針と索引                    |
| [AGENTS.md](./AGENTS.md)                       | AI エージェントが常に守るルールと詳細ルールへの入口 |
| [TASKS.md](./TASKS.md)                         | 実行順が必要な未完了タスク                          |

同じ説明を複数ファイルに重複させず、詳細を所有する文書にリンクする。実装固有の処理順や実装意図の説明などは、対象ソースコードのドキュメンテーションコメントを正とする。


## Links

- [Neo's World](https://neos21.net/)
