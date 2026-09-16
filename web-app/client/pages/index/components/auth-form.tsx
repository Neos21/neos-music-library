import ky from 'ky';
import { useState, type ChangeEvent, type ReactElement, type SubmitEvent } from 'react';

import { isEmpty } from '../../../../shared/helpers/is-empty';
import { mergeIssues } from '../../../../shared/helpers/merge-issues';
import { loginSchema } from '../../../../shared/schemas/login-schema';
import { extractApiErrorMessage } from '../../../helpers/extract-api-error-message';
import { useAdminStore } from '../../../stores/admin-store';

/** ログインフォーム or ログアウトボタン */
export const AuthForm = (): ReactElement => {
  const token = useAdminStore(state => state.token);
  
  const [password    , setPassword    ] = useState<string>('');      // パスワード
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);  // ログイン処理中か否か
  const [errorMessage, setErrorMessage] = useState<string>('');      // ログイン時のエラーメッセージ
  
  /** パスワード入力時に表示中のエラーメッセージも消去する */
  const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.target.value);
    if(!isEmpty(errorMessage)) setErrorMessage('');
  };
  
  /** 入力されたパスワードを検証し、ログインに成功した場合は JWT を保存する */
  const onSubmit = async (event: SubmitEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');
    
    const payload = { password };
    const parsed = loginSchema.safeParse(payload);
    if(!parsed.success) return setErrorMessage(mergeIssues(parsed.error));
    
    setIsSubmitting(true);
    try {
      const response = await ky.post('/api/login', { json: parsed.data }).json<{ result: { token: string; }; }>();
      useAdminStore.getState().setToken(response.result.token);
      setPassword('');  // ログイン成功時にリセットしておく
    }
    catch(error) {
      setErrorMessage(extractApiErrorMessage(error, 'ログインに失敗しました'));
    }
    finally {
      setIsSubmitting(false);
    }
  };
  
  /** ログアウトする */
  const onLogout = (): void => {
    setPassword('');  // 念のため入力フォームをリセットしておく
    useAdminStore.getState().logout();
  };
  
  return (
    <>
      {isEmpty(token) ? (
        <>
          <form onSubmit={onSubmit} className="flex gap-x-2">
            <input
              type="password" value={password} onChange={onChange} disabled={isSubmitting}
              className="input w-full flex-1 input-sm" placeholder="Password"
              autoComplete="current-password"
            />
            <button type="submit" className="btn shrink-0 btn-sm" disabled={isSubmitting || isEmpty(password)}>Login</button>
          </form>
          
          {!isEmpty(errorMessage) && (
            <div className="mt-4 alert alert-soft alert-error">{errorMessage}</div>
          )}
        </>
      ) : (
        <div className="text-right">
          <button type="button" className="btn btn-sm" onClick={onLogout}>Logout</button>
        </div>
      )}
    </>
  );
};
