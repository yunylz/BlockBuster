import { create } from "zustand";

interface Asset {
  id: number;
  name: string;
  src: string;
  author: string;
  metadata: object;
}

interface Block {
  blockName: string;
  bpm: number;
  videoPath: string;
}

interface IAssetStore {
  audios: Asset[];
  blocks: Block[];
  setAudios: (audio: Asset) => void;
  setBlocks: (block: Block) => void;
  clearAudios: () => void;
  clearBlocks: () => void;
}

const useAssetStore = create<IAssetStore>((set) => ({
  audios: [],
  blocks: [],
  setAudios: (audio) => set((state) => ({ audios: [...state.audios, audio] })),
  setBlocks: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
  clearAudios: () => set({ audios: [] }),
  clearBlocks: () => set({ blocks: [] })
}));

export default useAssetStore;