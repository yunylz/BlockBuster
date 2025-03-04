import { MusicTrack, Tape } from "./uaf";

export interface Block {
    blockName: string;
    bpm: number;
    videoPath: string;
    musicTrack: MusicTrack;
    dtape: Tape;
    startTime: number;
    endTime: number;
}

export interface TapeClip {
    tapeName: string;
    startTime: number;
    endTime: number;
}

export interface BeatOptions {
    bpm: number;
    songLength: number;
}

export interface BeatResult {
    beats: number[];
    totalBeats: number;
    songDuration: number;
}