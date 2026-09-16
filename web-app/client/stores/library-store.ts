import { get, set, del } from 'idb-keyval';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LibraryTrack } from '../../shared/types/app/library-track';
import type { StateStorage } from 'zustand/middleware';

/** IndexedDB を操作するストレージ定義 */
export const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) ?? null;
  },
  setItem: async (name: string, value: any): Promise<void> => {  // eslint-disable-line @typescript-eslint/no-explicit-any
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  }
};

/** ライブラリ一覧を管理する State */
type LibraryState = {
  /** ライブラリ一覧 */
  libraryTracks: Array<LibraryTrack>;
  /** IndexedDB から復元が完了したか否か */
  isHydrated: boolean;
  
  /** ライブラリ一覧を保存する */
  setLibraryTracks: (libraryTracks: Array<LibraryTrack>) => void;
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
};

/** ライブラリ一覧を IndexedDB と同期する Store */
export const useLibraryStore = create<LibraryState>()(
  persist(
    set => ({
      libraryTracks: [],
      isHydrated: false,
      
      setLibraryTracks: (libraryTracks): void => { set({ libraryTracks }) },
      setIsHydrated: (): void => { set({ isHydrated: true }) }
    }),
    {
      name: 'library',
      storage: createJSONStorage(() => indexedDBStorage),
      
      partialize: state => ({ libraryTracks: state.libraryTracks }),
      onRehydrateStorage: (): ((state: LibraryState | undefined) => void) => (state: LibraryState | undefined): void => state?.setIsHydrated()
    }
  )
);
