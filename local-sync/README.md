# Neo's Music Library : Local Sync

Windows PC 上で iTunes と D1 を同期する。


## 基本方針

- D1 を手作業で直接 INSERT・UPDATE・DELETE しない
    - 手動作業が必要な場合でも、人間が行うのは「どの値を採用するか」「どの楽曲同士を紐付けるか」の判断までとする
    - 人間の判断結果は JSON ファイルに記録してスクリプト経由で実行する
- 通常の同期処理においては「現在の iTunes ライブラリ全件」と「現在の D1 にある `tracks` テーブル全件」を比較することとし、ローカルに「前回エクスポート結果」を恒久保存する必要がないようにする
- 通常の差分判定は Persistent ID を使用する
- コメントは双方向同期ができるように 3 Way マージとし、コンフリクトは更新方針を JSON ファイルに記録して指示する


## 用語整理

- iTunes
    - ローカルの楽曲の状態を示す
    - `node-id3` パッケージで MP3 ファイルに ID3 タグを書き込み、iTunes COM を経由して `UpdateInfoFromFile()` を実行して iTunes ライブラリに変更を反映させるまでの一連の処理を「iTunes への反映」と表現する
    - 「MP3」「ID3」といった単語は実装詳細で登場する言葉とし、ドメイン上は基本的に「iTunes」に統一する
- D1
    - リモートの楽曲の状態を示す
    - Local Sync においては「Web アプリ」を認識する必要はないため、ドメイン条は基本的に「D1」に統一する
    - D1 のレコード内容を変更する処理を「D1 の UPDATE」と表現する
- 「更新」という曖昧な日本語はなるべく使用しないようにし、「iTunes への反映」「D1 の UPDATE」のいずれかで表現することとする
    - `update` という英単語は「iTunes への反映」「D1 の UPDATE」それぞれを示す際のリテラルとして用いる場合がある
- 「同期 (`sync`)」は iTunes と D1 の状態を同時に揃え切った状態を示す言葉とする


## Rebind : iTunes ライブラリ再構築時の紐付け直し作業

iTunes ライブラリを再構築すると Persistent ID が変更され、楽曲が一意に特定困難になる。この場合、通常同期とは別の「Rebind モード」を実行する。

このモードでは Persistent ID をキーに使わず、メタデータ (アーティスト名、アルバム名、トラック番号、曲名の4項目) で完全一致を探す。

全ての項目が一致した場合は、iTunes の Persistent ID を D1 に UPDATE する。

項目が一致しなかった場合は、「iTunes に新規追加された楽曲」「iTunes から削除された楽曲」「メタデータが変更されており完全合致しなかった既存楽曲」が考えられるため、一部一致で候補を提示し、人間が仕分ける。仕分けされた内容に基づき INSERT・UPDATE・DELETE を実行する。


## セットアップ

Node.js v24.18.0 ([nvm-windows](https://github.com/nvm-windows/nvm) 経由で導入) にて確認。

- iTunes COM を Node.js から操作するため `winax` パッケージを使用している
    - `winax` は node-gyp を使うため、Python と Visual Studio Build Tools が必要になる
    - Windows への Python インストール : Microsoft Store より [Python Install Manager](https://apps.microsoft.com/detail/9nq7512cxl7t?hl=ja-JP&gl=JP) をインストールする。初回起動時に `py` コマンドの PATH を通すか聞かれるので通しておき、PowerShell で `PS> py install 3.13` と実行して Python v3.13 をインストールする
    - [Build Tools For Visual Studio 2026](https://visualstudio.microsoft.com/ja/downloads/) をダウンロードし、「C++ によるデスクトップ開発」を選択してインストールする
- Cloudflare 管理画面の[ユーザー API トークン](https://dash.cloudflare.com/profile/api-tokens)より、D1 API をコールするための API トークンを作成する
    - 権限 : 「アカウント」「D1」「編集」を指定する

```bash
# 初期インストール
$ npm install
# `.env.example` を参考に `.env` を作成する
```


## スクリプト

- 通常の更新フロー

```bash
# iTunes ライブラリをエクスポートする → `itunes-tracks.json` を出力する
$ npm run export-itunes
# D1 の `tracks` テーブルを取得する → `d1-tracks.json` を出力する
$ npm run load-d1-tracks
# `itunes-tracks.json` と `d1-tracks.json` から同期計画を組み立てる → `sync-plan.json` と `comment-conflicts.json` を出力する
$ npm run create-sync-plan

# コメントのコンフリクトがあった場合は `comment-conflicts.json` の `resolution` を記入する

# `sync-plan.json` と `comment-conflicts.json` を参照して iTunes にコメントを反映する → `update-itunes-comment.json` を出力する
$ npm run update-itunes-comment
# `sync-plan.json` と `comment-conflicts.json` と `update-itunes-comment.json` を参照して D1 に各種データを INSERT・UPDATE・DELETE する → `update-d1.json` を出力する
$ npm run update-d1
```

- Rebind 時のフロー

```bash
# TODO : 要実装
$ npm run rebind
```

- その他スクリプト

```bash
# 前回実行結果ファイル (`-previous-` を含む JSON ファイル) を削除する
$ npm run remove-previous-files

# iTunes の全楽曲に対して `UpdateInfoFromFile()` を実行して反映する
$ npm run update-all-itunes-info
```


## 開発の開始

```bash
# Lint と型チェックを実行する
$ npm run lint
```


## メンテナンス

開発者向けの保守メモを示す。

### 既知の警告

Node.js v24.19.0 で実行したところ、`winax` が用いる Node.js の Native C++ 部分で次のようなエラーが発生する。

- `node::RemoveEnvironmentCleanupHook()` `Assertion failed`

このエラーは `try`・`catch` では検出できないものであり、Node.js 本体のバージョンに起因する。v24.18.0 にバージョンを下げて運用すればエラーは解消する。

```bash
$ nvm install 24.18.0
$ nvm use 24.18.0
$ npm rebuild winax --build-from-source
```


## iTunes COM

- [iTunes COM Interface : IITFileOrCDTrack Interface Reference](https://documentation.help/iTunesCOM/interfaceIITFileOrCDTrack.html)
