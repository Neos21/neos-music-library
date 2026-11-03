import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { indexedDBStorage } from '../helpers/indexed-db-storage';

import type { RepertoireListItem } from '../../shared/types/repertoire';

/** レパートリーと紐付く楽曲一覧を管理する State */
type RepertoiresState = {
  /** IndexedDB から復元が完了したか否か */
  isHydrated: boolean;
  /** レパートリーと紐付く楽曲一覧 */
  repertoires: Array<RepertoireListItem>;
  
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
  /** レパートリーと紐付く楽曲一覧を保存する */
  setRepertoires: (repertoires: Array<RepertoireListItem>) => void;
  /** 登録・更新後のレパートリーを反映する */
  upsertRepertoire: (repertoire: RepertoireListItem) => void;
  /** 削除後のレパートリーを一覧から除く */
  removeRepertoire: (id: number) => void;
};

/** レパートリーと紐付く楽曲一覧を IndexedDB と同期する Store */
export const useRepertoiresStore = create<RepertoiresState>()(
  persist(
    set => ({
      isHydrated: false,
      repertoires: [],
      
      setIsHydrated: (): void => { set({ isHydrated: true }) },
      setRepertoires: (repertoires): void => { set({ repertoires }) },
      upsertRepertoire: (repertoire): void => {
        set(state => ({
          repertoires: state.repertoires.some(item => item.id === repertoire.id)
            ? state.repertoires.map(item => item.id === repertoire.id ? repertoire : item)
            : [...state.repertoires, repertoire]
        }));
      },
      removeRepertoire: (id): void => {
        set(state => ({ repertoires: state.repertoires.filter(item => item.id !== id) }));
      }
    }),
    {
      name: 'repertoires',
      storage: createJSONStorage(() => indexedDBStorage),
      
      partialize: state => ({ repertoires: state.repertoires }),
      onRehydrateStorage: (): ((state: RepertoiresState | undefined) => void) => (state: RepertoiresState | undefined): void => state?.setIsHydrated()
    }
  )
);
