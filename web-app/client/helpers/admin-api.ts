import ky from 'ky';

import { httpStatusCode } from '../../shared/constants/http-status-code';
import { isEmpty } from '../../shared/helpers/is-empty';
import { useAdminStore } from '../stores/admin-store';

/**
 * 管理者向け API リクエストに JWT を付与する `ky` インスタンス
 * 
 * JWT が未保存の場合、または API が 401 を返した場合は Store をログアウト状態にする
 */
export const adminApi = ky.extend({
  hooks: {
    beforeRequest: [({ request }): void => {
      const token = useAdminStore.getState().token;
      if(isEmpty(token)) return useAdminStore.getState().logout();
      request.headers.set('Authorization', `Bearer ${token}`);
    }],
    afterResponse: [({ response }): void => {
      if(response.status === httpStatusCode.unauthorized) return useAdminStore.getState().logout();
    }]
  }
});
