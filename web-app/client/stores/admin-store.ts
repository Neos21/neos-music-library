import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** ユーザの認証状態を管理する State */
type AdminState = {
  /** LocalStorage から JWT の復元処理が完了したか否か・復元前の JWT が `null` である状態を「未ログイン状態」と誤判定しないために使用する */
  isHydrated: boolean;
  /** API 認証に使用する JWT・未ログイン時は `null` */
  token: string | null;
  
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
  /** ログイン成功時に JWT を保存する */
  setToken: (token: string) => void;
  /** ログアウト操作時に JWT を削除する */
  logout: () => void;
};

/** JWT を LocalStorage に永続化する認証用 Store */
export const useAdminStore = create<AdminState>()(
  persist(
    set => ({
      isHydrated: false,
      token: null,
      
      setIsHydrated: (): void => { set({ isHydrated: true }); },
      setToken: (token): void => { set({ token }); },
      logout: (): void => { set({ token: null }); }
    }),
    {
      // Store 名
      name: 'admin-store',
      
      // 復元完了状態を判定するため `partialize()` を使って LocalStorage には JWT だけを保存するようにする
      partialize: state => ({ token: state.token }),
      onRehydrateStorage: (): ((state: AdminState | undefined) => void) => (state: AdminState | undefined): void => state?.setIsHydrated()
    }
  )
);
