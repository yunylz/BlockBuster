/* eslint-disable @typescript-eslint/no-unused-vars */
import { v4 } from "uuid";

import { BeatOptions, BeatResult, Block } from "@/interfaces/assets";
import { MusicTrack, Tape, BlockReplacements, BlockDescriptor, BlockFlowTemplate, ActorTemplate, MusicTrackComponent } from "@/interfaces/uaf";

import useStore from "@/pages/editor/store/use-store";

import { ProjectState } from "@/store/project";
import UAFTime from "./uaf-time";


export function exportDtape(trackStore: ReturnType<typeof useStore>, projectStore: ProjectState) {
  const {
    tracks,
    // trackItemIds,
    trackItemsMap,
    // trackItemDetailsMap,
    // transitionsMap,
    // transitionIds,
    // fps,
  } = trackStore;
  const { mapName, beats } = projectStore;
  const time = new UAFTime(beats, true);

  console.log(beats)

  const blocks = tracks
    .filter((track: { type: string }) => track.type === "video")
    .flatMap((track: { items: unknown[] }) => track.items)
    .map((itemId: string | number) => {
      const item = trackItemsMap[itemId];
      return {
        blockName: item.metadata.blockName,
        startTime: item.display.from,
        endTime: item.display.to,
        dtape: item.metadata.dtape,
        musicTrack: item.metadata.musicTrack
      };
    });

  const uuids: Record<string, string> = {};
  const tape: Tape = {
      __class: "Tape",
      Clips: [],
      TapeClock: 0,
      TapeBarCount: 1,
      FreeResourcesAfterPlay: 0,
      MapName: mapName
  };

  for (let i = 0; i < blocks.length; i++) {
    const block: Block = blocks[i];
    const blockMapName: string = block.dtape.MapName;

    const musicTrack = block.musicTrack;
    const blockDtape = block.dtape;
    
    const startTime = block.startTime;
    const endTime = block.endTime;

    if (!uuids[blockMapName]) {
      uuids[blockMapName] = v4();
    }

    // Calculate time values for current block
    const { startTime: blockStartTime, duration: blockDuration } = time.makeTime(startTime, endTime);

    console.log(blockMapName, startTime, blockStartTime)
    const timeFixedClips = blockDtape.Clips.map(c => ({ 
      ...c, 
      StartTime: c.StartTime + blockStartTime 
    }));

    tape.Clips = [...tape.Clips, ...timeFixedClips]
  }

  console.log("tape", JSON.stringify(tape));
  return tape;
}

export function generateBeats({ bpm, songLength }: BeatOptions): BeatResult {
  // Validate inputs
  if (bpm <= 0) throw new Error('BPM must be greater than 0');
  if (songLength <= 0) throw new Error('Song length must be greater than 0');
  
  // Convert BPM to milliseconds per beat
  const msPerBeat: number = Math.round(60000 / bpm);
  
  // Convert to game beats (multiplied by 48 as in original code)
  // const convertBeat = (ms: number): number => ms * 48;
  
  const beats: number[] = [];
  let currentBeat: number = 0;
  
  // Generate beats until we reach or exceed the song length
  while (currentBeat * msPerBeat <= songLength) {
    beats.push(msPerBeat * currentBeat);
      currentBeat++;
  }
  
  return {
      beats,
      totalBeats: beats.length,
      songDuration: (beats.length - 1) * msPerBeat // actual duration covered by beats
  };
}

export function exportMusicTrack(projectStore: ProjectState) {
  const { mapName, beats } = projectStore;

  const markers = beats.map(b => b * 48);

  const musicTrackComponent: MusicTrackComponent = {
      __class: "MusicTrackComponent_Template",
      trackData: {
          __class: "MusicTrackData",
          structure: {
              __class: "MusicTrackStructure",
              markers: markers,
              sections: [],
              startBeat: 0,
              endBeat: markers[markers.length] || 0,
              videoStartTime: 0,
              previewEntry: 0,
              previewLoopStart: 30,
              previewLoopEnd: 60,
              volume: 1.0
          },
          path: `world/maps/${mapName.toLowerCase()}/audio/${mapName.toLowerCase()}.wav`,
          url: `jmcs://jd-contents/${mapName.toLowerCase()}/${mapName.toLowerCase()}.ogg`
      }
  };

  const musicTrack : MusicTrack = {
    __class: "Actor_Template",
    WIP: 0,
    LOWUPDATE: 0,
    UPDATE_LAYER: 0,
    PROCEDURAL: 0,
    STARTPAUSED: 0,
    FORCEISENVIRONMENT: 0,
    COMPONENTS: [musicTrackComponent]
  };

  return musicTrack;
};