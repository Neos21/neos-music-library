import { createHonoServer } from 'react-router-hono-server/cloudflare';

import { api, apiPath } from './routes/api/api';

/**
 * `wrangler.jsonc` や `vite.config.ts` にてエントリポイントと識別するため Default Export が必須
 * 
 * NOTE : `$ vite dev` コマンドで認識させるため `createHonoServer()` でのラップが必要
 */
export default await createHonoServer({
  configure(app) {
    app.route(apiPath, api);  // `routes/` ディレクトリ配下は URI パスとディレクトリ階層を揃えるため `/api` 配下から分けて作ってある
  }
});
