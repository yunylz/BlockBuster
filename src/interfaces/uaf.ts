import { MotionClip, PictogramClip, TapeReferenceClip } from "./uaf/tape";

export interface ActorTemplate {
    __class: "Actor_Template";
    WIP: number;
    LOWUPDATE: number;
    UPDATE_LAYER: number;
    PROCEDURAL: number;
    STARTPAUSED: number;
    FORCEISENVIRONMENT: number;
    COMPONENTS: unknown[];
}

export interface Tape {
    __class: "Tape";
    Clips: (PictogramClip | MotionClip | TapeReferenceClip)[];
    TapeClock: number;
    TapeBarCount: number;
    FreeResourcesAfterPlay: number;
    MapName: string;
}

export interface MusicTrackComponent {
    __class: "MusicTrackComponent_Template";
    trackData: {
        __class: "MusicTrackData";
        structure: {
            __class: "MusicTrackStructure";
            markers: number[];
            sections: {
                __class: "MusicSection";
                marker: number;
                sectionType: number;
                comment: string;
            }[];
            startBeat: number;
            endBeat: number;
            videoStartTime: number;
            previewEntry: number;
            previewLoopStart: number;
            previewLoopEnd: number;
            volume: number;
        };
        path: string;
        url: string;
    };
}

export interface BlockFlowTemplate {
    __class: "JD_BlockFlowTemplate",
    IsMashUp: number,
    IsPartyMaster: number,
    BlockDescriptorVector: BlockReplacements[]
};

export interface BlockReplacements {
    __class: "JD_BlockReplacements";
    BaseBlock: BlockDescriptor;
    AlternativeBlocks: BlockDescriptor[];
}

export interface BlockDescriptor {
    __class: "JD_BlockDescriptor";
    songName: string;
    frstBeat: number;
    lastBeat: number;
    songSwitch: number;
    videoCoachOffset: [number, number];
    videoCoachScale: number;
    danceStepName: string;
    playingSpeed: number;
    isEntryPoint: number;
    isEmptyBlock: number;
    isNoScoreBlock: number;
    guid: string;
    forceDisplayLastPictos: number;
}
  

export interface MusicTrack extends ActorTemplate {
    COMPONENTS: [MusicTrackComponent];
}

export interface BlockFlow extends ActorTemplate {
    COMPONENTS: [BlockFlowTemplate];
}