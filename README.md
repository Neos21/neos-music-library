# Neo's Music Library

Windows iTunes のライブラリ情報を Cloudflare D1 と同期し、Web アプリ上で以下を管理する個人用アプリ。

- 楽曲情報 (アーティスト名・アルバム名・トラック番号・曲名)
    - コメント
- ギター・ベース・ボーカル・キーボード等のレパートリー
    - 習熟度
    - 参考 URL
    - 自分の演奏動画 URL

基本思想として、iTunes ライブラリを楽曲情報の正・マスターとする。

Web アプリ側は iTunes の代替ライブラリ管理ツールにはせず、iTunes に存在する楽曲に付帯情報を追加する用途を中心とする。

ただし、レパートリー情報については「iTunes ライブラリに楽曲情報があるか否か」と独立して保持できるようにする。


## 全体構成

```
Windows PC
└ iTunes アプリ
   └ MP3 ファイル
↑ ↓
ローカル同期スクリプト
  - MP3 ファイルへの ID3 タグの書き込み、iTunes ライブラリへの反映
  - D1 REST API を用いた D1 の CRUD
  - Rebind (iTunes ライブラリ再構築時の操作)
↑ ↓
Cloudflare D1
↑ ↓
Cloudflare Workers : Hono + React Router Web アプリ
```


## 役割分担

### iTunes

楽曲情報のマスター。以下のような情報は、原則として iTunes 側を正とする。

- アーティスト名
- アルバム名
- トラック番号
- 曲名
- Persistent ID High
- Persistent ID Low
- iTunes 上で入力されたコメント

Web アプリ側からこれらを自由編集する機能は持たせない。

### ローカル同期スクリプト

iTunes・D1 間の橋渡しとして以下のような作業を行う。

- iTunes ライブラリの全件取得
- D1 上の楽曲情報の全件取得
- メタデータの差分判定
- D1 にインポートした時の旧 iTunes のコメント・Web アプリで入力されたコメント・現在の iTunes ファイルのコメントとの 3 Way マージおよびコンフリクト検出
- コメント情報の iTunes への反映
- D1 への INSERT・UPDATE・DELETE の実行
- iTunes ライブラリ再構築時の Rebind (Persistent ID が変化することによる紐付け直し作業)

D1 の操作は Cloudflare D1 REST API を利用する。Wrangler CLI への依存は必須としない。

### Web アプリ

主に「楽曲に付加する情報」を管理する。

- コメント
- ギター等のレパートリー
    - 参考 URL
    - 自分の演奏 URL

Web アプリは iTunes COM や MP3 ファイルの存在を意識しない。D1 のみを操作する。


## テーブル定義

[create-tables.sql](./web-app/migrations/create-tables.sql) を正とする。


## ドキュメント

AI を用いた開発を考慮してドキュメントを分割配置している。

| ファイル                                       | 役割                                    |
|------------------------------------------------|-----------------------------------------|
| [local-sync/README.md](./local-sync/README.md) | Local Sync 部分のドキュメント           |
| [web-app/README.md](./web-app/README.md)       | Web App 部分のドキュメント              |
| [AGENTS.md](./AGENTS.md)                       | AI が常に守るルールと詳細ルールへの入口 |
| [TASKS.md](./TASKS.md)                         | 実行順が必要な未完了タスク              |
| [docs/README.md](./docs/README.md)             | 詳細ドキュメントの配置方針と索引        |

同じ説明を複数ファイルに重複させず、詳細を所有する文書にリンクする。実装固有の処理順や実装意図の説明などは、対象ソースコードのドキュメンテーションコメントを正とする。


## Links

- [Neo's World](https://neos21.net/)
