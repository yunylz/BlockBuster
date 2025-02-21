export interface MotionPlatformSpecific {
    __class: "MotionPlatformSpecific";
    ScoreScale: number;
    ScoreSmoothing: number;
    ScoringMode: number;
}

export interface MotionClip {
    __class: "MotionClip";
    Id: number;
    TrackId: number;
    IsActive: number;
    StartTime: number;
    Duration: number;
    ClassifierPath: string;
    GoldMove: number;
    CoachId: number;
    MoveType: number;
    Color: number[];
    MotionPlatformSpecifics: {
        X360: MotionPlatformSpecific;
        ORBIS: MotionPlatformSpecific;
        DURANGO: MotionPlatformSpecific;
    };
}

export interface PictogramClip {
    __class: "PictogramClip";
    Id: number;
    TrackId: number;
    IsActive: number;
    StartTime: number;
    Duration: number;
    PictoPath: string;
    MontagePath: string;
    AtlIndex: number;
    CoachCount: number;
}