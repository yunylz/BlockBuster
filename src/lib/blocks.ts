/* eslint-disable @typescript-eslint/no-unused-vars */
import { Block } from "@/interfaces/assets";
import { MusicTrack, Tape } from "@/interfaces/uaf";

import useStore from "@/pages/editor/store/use-store";

import { VideoProps } from "@designcombo/timeline";

/**
 * Some UAF files have a null byte at the end of the file, this is due to extracting via Unpakke or similar tools.
 * This script removes the null byte.
 * @param buffer
 * @returns
 */
function cleanNullBytes(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  let endIndex = uint8Array.length;
  while (endIndex > 0 && uint8Array[endIndex - 1] === 0) {
    endIndex--;
  }
  const cleanArray = uint8Array.slice(0, endIndex);
  return new TextDecoder().decode(cleanArray);
};

export async function parseBlocks(folders: FileSystemDirectoryHandle[]): Promise<Block[]> {
  const blocks: Block[] = [];

  for (const folder of folders) {
    try {
      const blockName = folder.name;

      // Try to get all required folders
      let audioFolder: FileSystemDirectoryHandle;
      let videoFolder: FileSystemDirectoryHandle;
      let timelineFolder: FileSystemDirectoryHandle;

      try {
        audioFolder = await folder.getDirectoryHandle('audio');
        videoFolder = await folder.getDirectoryHandle('videoscoach');
        timelineFolder = await folder.getDirectoryHandle('timeline');
      } catch (error) {
        // Skip if any folder doesn't exist
        continue;
      }

      // Try to get all required files
      let audioFile: FileSystemFileHandle;
      let videoFile: FileSystemFileHandle;
      let dtapeFile: FileSystemFileHandle;

      try {
        audioFile = await audioFolder.getFileHandle(`${blockName}_musictrack.tpl.ckd`);
        videoFile = await videoFolder.getFileHandle(`${blockName}.webm`);
        dtapeFile = await timelineFolder.getFileHandle(`${blockName}_tml_dance.dtape.ckd`);
      } catch (error) {
        // Skip if any file doesn't exist
        continue;
      }

      // Try to parse the musictrack JSON
      let musicTrackJson: MusicTrack;
      try {
        const file = await audioFile.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const cleanedContent = cleanNullBytes(arrayBuffer);
        musicTrackJson = JSON.parse(cleanedContent);
        // Validate the JSON structure
        if (!musicTrackJson?.COMPONENTS?.[0]?.trackData?.structure?.markers?.[1]) {
          // Skip if JSON doesn't have the required structure
          continue;
        }
      } catch (error) {
        // Skip if JSON parsing fails
        continue;
      }

      // Try to parse the dtape JSON
      let dtapeJson: Tape;
      try {
        const file = await dtapeFile.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const cleanedContent = cleanNullBytes(arrayBuffer);
        dtapeJson = JSON.parse(cleanedContent);
        // Add any validation for dtape structure if needed
        if (!dtapeJson) {
          continue;
        }
      } catch (error) {
        // Skip if dtape parsing fails
        continue;
      }

      // Try to create video URL
      let videoPath: string;
      try {
        const videoFileContent = await videoFile.getFile();
        videoPath = URL.createObjectURL(videoFileContent);
      } catch (error) {
        // Skip if video file can't be read
        continue;
      }

      // Calculate BPM
      const markerValue = musicTrackJson.COMPONENTS[0].trackData.structure.markers[1];
      const bpm = Math.floor(Math.round((60000 / (markerValue / 48)) * 100) / 100);

      // Only add the block if we got here without any errors
      blocks.push({
        blockName,
        bpm,
        videoPath,
        musicTrack: musicTrackJson,
        dtape: dtapeJson
      });
    } catch (error) {
      // Skip any block that throws an error
      console.error(`Error processing folder ${folder.name}:`, error);
    }
  }

  return blocks;
};

export function getBlock(trackId : VideoProps["id"]) {
  
};