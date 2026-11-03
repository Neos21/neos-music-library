import { index, route, type RouteConfig } from '@react-router/dev/routes';

/** クライアントルート定義 */
export default [
  index('./pages/index/index.tsx'),
  route('/tracks', './pages/tracks/tracks.tsx')
] satisfies RouteConfig;
