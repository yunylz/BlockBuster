/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ProjectData {
    id: string;
    fps: number;
    tracks: any[];
    size: {
        width: number,
        height: number
    };
    trackItemDetailsMap: Record<string, any>;
    trackItemIds: string[];
    transitionsMap: Record<string, any>;
    trackItemsMap: Record<string, any>;
    transitionIds: string[];
    mapName: string;
    bpm: number;
    audioLength: number;
    beats: number[];
}