import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { indexedDBStorage } from '../helpers/indexed-db-storage';

import type { TrackListItem } from '../../shared/types/track';

/** 楽曲一覧を管理する State */
type TracksState = {
  /** IndexedDB から復元が完了したか否か */
  isHydrated: boolean;
  /** 楽曲一覧 */
  tracks: Array<TrackListItem>;
  
  /** 復元処理が完了したか否かを更新する */
  setIsHydrated: () => void;
  /** 楽曲一覧を保存する */
  setTracks: (tracks: Array<TrackListItem>) => void;
  /** コメントのみ更新する */
  updateTrackComment: (updatedTrack: Pick<TrackListItem, 'id' | 'comment'>) => void;
};

/** 楽曲一覧を IndexedDB と同期する Store */
export const useTracksStore = create<TracksState>()(
  persist(
    set => ({
      isHydrated: false,
      tracks: [],
      
      setIsHydrated: (): void => { set({ isHydrated: true }) },
      setTracks: (tracks): void => { set({ tracks }) },
      updateTrackComment: (updatedTrack): void => {
        set(state => ({
          tracks: state.tracks.map(track => track.id === updatedTrack.id
            ? { ...track, comment: updatedTrack.comment }
            : track
          )
        }));
      }
    }),
    {
      name: 'tracks',
      storage: createJSONStorage(() => indexedDBStorage),
      
      partialize: state => ({ tracks: state.tracks }),
      onRehydrateStorage: (): ((state: TracksState | undefined) => void) => (state: TracksState | undefined): void => state?.setIsHydrated()
    }
  )
);
