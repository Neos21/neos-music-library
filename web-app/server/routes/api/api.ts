import { Hono } from 'hono';

import { library, libraryPath } from './library/library';
import { login, loginPath } from './login/login';
import { repertoires, repertoiresPath } from './repertoires/repertoires';
import { tracks, tracksPath } from './tracks/tracks';

import type { HonoBindings } from '../../types/hono-bindings';

export const api = new Hono<{ Bindings: HonoBindings; }>();
export const apiPath = '/api' as const;  // エンドポイントパスをインスタンスと同じ位置から `export` することで命名の散在を防ぐ

api.route(loginPath      , login);
api.route(libraryPath    , library);
api.route(tracksPath     , tracks);
api.route(repertoiresPath, repertoires);
