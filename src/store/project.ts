import { create } from 'zustand';

export interface ProjectState {
  mapName: string;
  setMapName: (bpm: string) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  audioLength: number | null;
  setAudioLength: (length: number) => void;
  beats: number[];
  setBeats: (beats: number[]) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  mapName: "mapNameMU",
  setMapName: (mapName: string) => set({ mapName }),
  bpm: 125, // Default BPM
  setBpm: (bpm: number) => set({ bpm }),
  audioLength: null,
  setAudioLength: (length: number) => set({ audioLength: length }),
  beats: [],
  setBeats: (beats: number[]) => set({ beats }),
}));