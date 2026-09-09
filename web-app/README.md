# Neo's Music Library : Web App

React Router (SPA モード) + Hono + Cloudflare Workers で構成された Web アプリ。


## サンプルコード

サンプルコードには `example`・`examples` の命名・記載がある他、隅付き括弧を用いたプレースホルダを記載している。

### 主な説明用サンプルファイル (実コードからは削除して良い)

- `server/repositories/examples-repository.ts`
- `server/routes/api/examples/`
- `shared/schemas/example-schema.ts`
- `shared/types/entities/example.ts`


## 技術スタック

- フロントエンド : React + React Router (SPA モード)
    - `isbot` パッケージは React Router が必須で入れてくるため、SPA モードでは使用しない想定だが `package.json` に記述が残る
- UI : Tailwind CSS + daisyUI
- State 管理 : Zustand
- HTTP クライアント : ky
- バリデーション : Zod
- バックエンド : Hono (TypeScript)
- ビルドツール : Vite
- 実行環境 : Cloudflare Workers
- DB : Cloudflare D1 (SQLite)
- Linter・Formatter : ESLint
    - セットアップで用いるため `globals` パッケージを導入している
    - 動作のために `jiti` パッケージが必要なため `package.json` に記載アリ


## 開発の開始

```bash
# 初期インストール
$ npm install
# `.dev.vars.example` を参考に `hono-bindings.ts` と揃うよう `.dev.vars` を作成する

# 開発サーバを起動する
$ npm run dev

# Lint を実行する
$ npm run lint

# ビルドする
$ npm run build

# ビルド後にプレビューサーバを起動する
$ npm run preview
```


## Cloudflare Workers へのデプロイ

本番デプロイは開発者が手動で行う。AI エージェントは実行しない。

```bash
$ npm run deploy
```


## D1 データベース操作

D1 の作成、SQL 実行、マイグレーションは開発者が手動で行う。AI エージェントはローカル・本番のどちらに対しても実行してはならない。

`./schema.sql` は任意の SQL ファイルを表す開発者向けのコマンド例であり、同名ファイルを本リポジトリに配置する仕様ではない。AI エージェントはファイルの欠落として扱わず、以下のコマンド例を実行してはならない。

```bash
# D1 データベースを作成する
$ wrangler d1 create music-library

# テーブルを確認するコマンド例
$ wrangler d1 execute music-library --local  --command='SELECT * FROM 【テーブル名】'
$ wrangler d1 execute music-library --remote --command='SELECT * FROM 【テーブル名】'

# 任意の SQL ファイルを実行するコマンド例
$ wrangler d1 execute music-library --local  --file='./schema.sql'
$ wrangler d1 execute music-library --remote --file='./schema.sql'

# マイグレーション用 SQL を実行するコマンド例
$ wrangler d1 execute music-library --local  --file='./migrations/create-tables.sql'
$ wrangler d1 execute music-library --local  --file='./migrations/drop-tables.sql'
$ wrangler d1 execute music-library --remote --file='./migrations/create-tables.sql'
$ wrangler d1 execute music-library --remote --file='./migrations/drop-tables.sql'

# テーブル・インデックス一覧を出力するコマンド例
$ wrangler d1 execute music-library --local  --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
$ wrangler d1 execute music-library --local  --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''
$ wrangler d1 execute music-library --remote --command='SELECT * FROM sqlite_master WHERE type = '\''table'\'''
$ wrangler d1 execute music-library --remote --command='SELECT * FROM sqlite_master WHERE type = '\''index'\'''

# リモートのデータをバックアップとして取得するコマンド例
$ wrangler d1 execute music-library --remote --command='SELECT * FROM 【テーブル名】' --json | jq --compact-output '.[].results[]' > ./migrations/backup.jsonl
```


## シークレット管理

- ローカル開発時は Git 管理対象外の `.dev.vars` が自動的に参照される
- Binding の型は `server/types/hono-bindings.ts` に定義する
- 本番シークレットの登録は開発者が手動で行い、AI エージェントは実行しない

```bash
$ echo 'EXAMPLE_VALUE' | wrangler secret put ADMIN_PASSWORD   --name music-library
$ echo 'EXAMPLE_VALUE' | wrangler secret put ADMIN_JWT_SECRET --name music-library
```


## アーキテクチャ

本プロジェクトのシステム構成、依存方向、各レイヤーの責務を示す。

### システム構成

```text
Browser
  └ React Router SPA
     └ `/api` への HTTP リクエスト
        └ Cloudflare Workers + Hono
           └ Cloudflare D1 (SQLite)
```

- React Router を SPA モードで利用し、画面遷移とログイン後の共通レイアウトを構成する
- Hono の `/api` 配下に認証・各リソースのルートを登録する
- Cloudflare Workers の Binding から D1 と認証用環境変数を参照する

### ディレクトリの責務

| ディレクトリ           | 責務                                                                             |
|------------------------|----------------------------------------------------------------------------------|
| `client/`              | React のページ、レイアウト、クライアント State、API 呼び出し、表示用ヘルパー     |
| `server/routes/`       | HTTP 入出力、認証、パラメータ・リクエスト検証、レスポンスへの変換                |
| `server/repositories/` | D1 の単一テーブルに対する CRUD                                                   |
| `server/services/`     | 複数テーブルを横断する Read Model と、複数 Repository を組み合わせるユースケース |
| `server/types/`        | JOIN 直後の SQL 行など、サーバ内部だけで使う型                                   |
| `shared/constants/`    | Client・Server で共有する定数                                                    |
| `shared/helpers/`      | 業務知識を持たない共有処理                                                       |
| `shared/schemas/`      | API と画面で共有する Zod Schema                                                  |
| `shared/services/`     | Client・Server の両方から利用するビジネスロジック                                |
| `shared/types/`        | Entity、画面・API 用の合成型、汎用型                                             |

### 依存方向

```text
client ┐
       ├─> shared
server ┘

server/routes   -> server/repositories (単一テーブルの単純な CRUD)
server/routes   -> server/services     (複合 Read Model・ユースケース)
server/services -> server/repositories または D1
server/services -> shared/services
```

- `shared/` は `client/`・`server/` に依存しない
- Route は HTTP の責務に限定し、DB クエリやビジネスロジックを直接持たない
- Repository は単一テーブルの永続化を抽象化し、画面都合の複合 `JOIN` を持たない
- 複数テーブルを横断した Read Model は、用途名を持つ Service が D1 から直接構築する

### レイヤーの境界

`shared/` には `client/`・`server/` 間で共有する契約と処理を置き、サーバ内部だけで扱う DB 取得直後の表現は `server/` に閉じる。複合 Read Model は Service が公開可能なモデルに変換してから Route に渡す。

型の分類と配置に関する実装ルールは [Shared Rules](../docs/agent-rules/shared.md)、サーバ各層の実装ルールは [Backend Rules](../docs/agent-rules/backend.md) を参照のこと。


## ページ一覧

| パス    | 機能                                                                         |
|-------- |------------------------------------------------------------------------------|
| `/`     | ログイン。ログイン済みの場合は `/home` に遷移する                            |
| `/home` | ログイン後のホーム。共通サイドメニューはこのページへの遷移後に初めて表示する |


## API

Hono で提供する `/api` 配下の API 契約を示す。各項目の厳密な型とバリデーションは、対応する `shared/types/` と `shared/schemas/` を正とする。

### 共通仕様

- 管理用 API コール時は JWT 認証を必要とする
- 正常レスポンスはトップレベルを `result` のみとする
- エラーレスポンスはトップレベルを `error` のみとする
- JSON Body は構文不正と Schema 不正を区別せず、クライアント入力エラーとして 400 を返す
- URL の ID は整数に変換できない場合に 400 を返す
- 想定される Service エラーは `Result` 型で表す

```json
{ "result": {} }
```

```json
{ "error": "エラーメッセージ" }
```

### API エンドポイント一覧

| リソース | メソッド | パス                | 用途                                |
|----------|----------|---------------------|-------------------------------------|
| 認証     | `POST`   | `/api/login`        | パスワードを照合して JWT を発行する |
| サンプル | `GET`    | `/api/examples`     | 一覧を取得する                      |
| サンプル | `GET`    | `/api/examples/:id` | 1件取得する                         |
| サンプル | `POST`   | `/api/examples`     | 追加する                            |
| サンプル | `PATCH`  | `/api/examples/:id` | 更新する                            |
| サンプル | `DELETE` | `/api/examples/:id` | 削除する                            |


## メンテナンス

開発者向けの保守メモを示す。ここに記載した判断は依存関係やツールの状況に応じて見直す。

### 生成ファイル

`$ npm run build` は `$ wrangler types` と React Router の型生成を実行する。生成後は `worker-configuration.d.ts` などの差分を確認し、設定変更に由来する必要な差分だけを残す。

### 既知の警告

現状、ビルド時に Wrangler から `envFile` の非推奨警告が表示される。現時点ではビルドを失敗させるものではないため無視して良い。別の互換性対応と合わせて見直す。
