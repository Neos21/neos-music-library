import ky from 'ky';
import { useEffect, useState, type ChangeEvent, type ReactElement, type SubmitEvent } from 'react';
import { useNavigate } from 'react-router';

import { isEmpty } from '../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../shared/helpers/merge-issues';
import { loginSchema } from '../../../shared/schemas/login-schema';
import { authenticationRedirectReasonReloginRequired, sessionStorageKeyAuthenticationRedirectReason } from '../../constants/client-constants';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useAdminStore } from '../../stores/admin-store';

/** トップページ (ログインページ) */
export default function Index(): ReactElement {
  const navigate = useNavigate();
  
  // SessionStorage に再ログイン要求があるか否か・現在の表示中だけメッセージ表示に使用する
  const [shouldRequestRelogin] = useState<boolean>(() => sessionStorage.getItem(sessionStorageKeyAuthenticationRedirectReason) === authenticationRedirectReasonReloginRequired);
  
  // 再ログインメッセージの表示有無に関わらず表示要求を次回のトップページ表示に持ち越さない
  useEffect((): void => {
    sessionStorage.removeItem(sessionStorageKeyAuthenticationRedirectReason);
  }, []);
  
  const [password    , setPassword    ] = useState<string>('');      // パスワード
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // ログイン処理中か否か
  const [loginError  , setLoginError  ] = useState<string>('');      // エラーメッセージ
  
  /** パスワード入力時に表示中のエラーメッセージも消去する */
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
    if(!isEmpty(loginError)) setLoginError('');
  };
  
  /** 入力されたパスワードを検証し、ログインに成功した場合は JWT を保存する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoginError('');
    
    const payload = { password };
    const parsed = loginSchema.safeParse(payload);
    if(!parsed.success) return setLoginError(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      const response = await ky.post('/api/login', { json: parsed.data }).json<{ result: { token: string; }; }>();
      useAdminStore.getState().setToken(response.result.token);
      navigate('/library');
    }
    catch(error) {
      setLoginError(extractApiErrorMessage(error, 'ログインに失敗しました'));
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="px-2 py-4">
      <form onSubmit={onSubmit} className="mb-4 flex gap-x-2">
        <input
          type="password" value={password} onChange={onChange} disabled={isSubmitting}
          className="input w-full flex-1 input-sm" placeholder="Password"
          autoComplete="current-password"
        />
        <button type="submit" className="btn shrink-0 btn-sm" disabled={isSubmitting || isEmpty(password)}>Login</button>
      </form>
      
      {shouldRequestRelogin && (
        <div className="mb-4 alert alert-soft alert-warning">再度ログインしてください</div>
      )}
      
      {!isEmpty(loginError) && (
        <div className="alert alert-soft alert-error">{loginError}</div>
      )}
    </main>
  );
}
