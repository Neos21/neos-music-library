# AGENTS.md

本プロジェクトで AI エージェントが常に守る作業手順と、作業内容ごとに読む詳細ルールを示す。


## 作業開始前

1. [README.md](./README.md) と [docs/agent-rules/README.md](./docs/agent-rules/README.md) を読む
2. [TASKS.md](./TASKS.md) が存在する場合は実行ルールを読み、ファイル内で最初の未完タスクだけを実行候補とする
    - `TASKS.md` が存在しない場合は、現在開発者が承認した作業範囲を1タスクとして扱う
3. [workflow.md](./docs/agent-rules/workflow.md) と [common.md](./docs/agent-rules/common.md) を読む
4. 作業対象に応じて、次の詳細ルールを読む
5. 実行前に変更方針と対象範囲を示し、開発者に開始確認を取る

| 作業対象                               | 必ず読む詳細ルール                                                                     |
|----------------------------------------|----------------------------------------------------------------------------------------|
| `web-app/client/`                      | [frontend.md](./docs/agent-rules/frontend.md)                                          |
| `web-app/server/`                      | [backend.md](./docs/agent-rules/backend.md)                                            |
| `web-app/shared/`                      | [shared.md](./docs/agent-rules/shared.md)                                              |
| Markdown・ドキュメンテーションコメント | [documentation.md](./docs/agent-rules/documentation.md)                                |
| レビュー指摘への対応                   | [review-feedback.md](./docs/agent-rules/review-feedback.md) と変更対象に対応するルール |

複数領域を変更する場合は、該当する全ての詳細ルールを読む。文書は必要な領域だけを段階的に読み、無関係なルールを作業コンテキストへ追加しない。


## 常に守る禁止事項

- Cloudflare D1 への DB マイグレーションを実行しない
- Cloudflare Workers への本番デプロイを実行しない
- 本番シークレットの登録・変更を実行しない
- 修正対象でない既存変更、コメント、空白を編集・削除しない
- 開発者への確認なしに `TASKS.md` の次タスクに移行しない


## 作業完了時

1. 変更差分と `$ git diff --check` を確認する
2. `$ npm run lint && npm run build` を実行する
3. 変更内容、検証結果、残る注意事項を報告して開発者のレビューを求める

3回以上修正しても Lint・ビルドエラーを解消できない場合、または必要なコマンドを実行できない場合は処理を中止して報告する。
