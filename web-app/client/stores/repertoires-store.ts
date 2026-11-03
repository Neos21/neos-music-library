import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { indexedDBStorage } from '../helpers/indexed-db-storage';

import type { RepertoireListItem } from '../../shared/types/repertoire';

/** レパートリーと紐付く楽曲一覧を管理する State */
type RepertoiresState = {
  /** レパートリーと紐付く楽曲一覧 */
  repertoires: Array<RepertoireListItem>;
  /** IndexedDB から復元が完了したか否か */
  isHydrated: boolean;
  
  /** レパートリーと紐付く楽曲一覧を保存する */
  setRepertoires: (repertoires: Array<RepertoireListItem>) => void;
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
};

/** レパートリーと紐付く楽曲一覧を IndexedDB と同期する Store */
export const useRepertoiresStore = create<RepertoiresState>()(
  persist(
    set => ({
      repertoires: [],
      isHydrated: false,
      
      setRepertoires: (repertoires): void => { set({ repertoires }) },
      setIsHydrated: (): void => { set({ isHydrated: true }) }
    }),
    {
      name: 'repertoires',
      storage: createJSONStorage(() => indexedDBStorage),
      
      partialize: state => ({ repertoires: state.repertoires }),
      onRehydrateStorage: (): ((state: RepertoiresState | undefined) => void) => (state: RepertoiresState | undefined): void => state?.setIsHydrated()
    }
  )
);
