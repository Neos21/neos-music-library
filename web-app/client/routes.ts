import { index, route, type RouteConfig } from '@react-router/dev/routes';

/** クライアントルート定義 */
export default [
  index('./pages/index/index.tsx'),
  route('/library', './pages/library/library.tsx')
] satisfies RouteConfig;
