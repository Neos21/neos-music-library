# Neo's Music Library : Local Sync

Windows PC 上で iTunes ライブラリおよび MP3 ファイルを参照・更新し、D1 REST API を用いて D1 と同期する。


## セットアップ

Node.js v24.19.0 ([nvm-windows](https://github.com/nvm-windows/nvm) 経由で導入) にて確認。

- iTunes COM を Node.js から操作するため `winax` パッケージを使用している
    - `winax` は node-gyp を使うため、Python と Visual Studio Build Tools が必要になる
    - Windows への Python インストール : Microsoft Store より [Python Install Manager](https://apps.microsoft.com/detail/9nq7512cxl7t?hl=ja-JP&gl=JP) をインストールする。初回起動時に `py` コマンドの PATH を通すか聞かれるので通しておき、PowerShell で `PS> py install 3.13` と実行して Python v3.13 をインストールする
    - [Build Tools For Visual Studio 2026](https://visualstudio.microsoft.com/ja/downloads/) をダウンロードし、「C++ によるデスクトップ開発」を選択してインストールする
- Cloudflare 管理画面の[ユーザー API トークン](https://dash.cloudflare.com/profile/api-tokens)より、D1 API をコールするための API トークンを作成する
    - 権限 : 「アカウント」「D1」「編集」を指定する
