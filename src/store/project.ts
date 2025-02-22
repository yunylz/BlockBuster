import { create } from 'zustand';

export interface ProjectState {
  mapName: string;
  setMapName: (mapName: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  audioLength: number;
  setAudioLength: (length: number) => void;
  beats: number[];
  setBeats: (beats: number[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  mapName: "mapNameMU",
  setMapName: (mapName: string) => set({ mapName }),
  bpm: 0, // Default BPM
  setBpm: (bpm: number) => set({ bpm }),
  audioLength: 0,
  setAudioLength: (length: number) => set({ audioLength: length }),
  beats: [],
  setBeats: (beats: number[]) => set({ beats }),
}));