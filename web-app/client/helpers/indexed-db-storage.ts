import { get, set, del } from 'idb-keyval';

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

