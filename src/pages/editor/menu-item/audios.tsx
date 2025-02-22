import { Button } from "@/components/ui/button";
import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { Music, Music2, Search, UploadIcon, Loader2, Check } from "lucide-react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import React, { useState, useMemo, useRef } from "react";
import { generateId } from "@designcombo/timeline";
import useAssetStore from "@/store/assets";
import { useProjectStore } from "@/store/project";
import useStore from "@/pages/editor/store/use-store";
import { generateBeats } from "@/lib/uaf";

const getAudioDuration = (audioUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.src = audioUrl;
    
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration * 1000); // Convert to milliseconds
    });
    
    audio.addEventListener('error', (error) => {
      reject(error);
    });
  });
};

const EmptyAudioState = () => (
  <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
    <div className="rounded-full p-6 mb-4 bg-zinc-900">
      <Music2 className="w-6 h-6 text-zinc-500" />
    </div>
    <p className="text-base text-zinc-500">No audios</p>
    <p className="text-sm text-zinc-600">Click the upload button to add audio files.</p>
  </div>
);

export const Audios = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const audios = useAssetStore((state) => state.audios);
  const setAudios = useAssetStore((state) => state.setAudios);
  const { bpm, setAudioLength, setBeats } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Get editor store
  const store = useStore();
  const hasAudioTrack = store.tracks.some((track: { type: string }) => track.type === "audio");

  const filteredAudios = useMemo(() => {
    console.log(audios)
    const query = searchQuery.toLowerCase();
    return audios.filter(
      (audio) =>
        audio.name.toLowerCase().includes(query) ||
        audio.author.toLowerCase().includes(query)
    );
  }, [audios, searchQuery]);

  const handleAddAudio = async (src: string) => {
    if (hasAudioTrack) {
      alert('An audio file has already been added to the timeline');
      return;
    };

    if (bpm === 0) {
      alert('You must set the BPM before adding an audio to the timeline.');
      return;
    };

    try {
      const duration = await getAudioDuration(src);
      const beatMarkers = generateBeats({
        bpm,
        songLength: duration
      });
      setBeats(beatMarkers.beats)
      
      dispatch(ADD_AUDIO, {
        payload: {
          id: generateId(),
          details: { 
            src,
            beats: beatMarkers.beats,
            duration
          },
        },
        options: {},
      });

      setAudioLength(duration);
    } catch (error) {
      console.error('Error adding audio:', error);
    }
  };

  const isDuplicateFileName = (fileName: string) => {
    return audios.some(audio => audio.name === fileName);
  };

  const onInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    if (hasAudioTrack) {
      alert('An audio file has already been added to the timeline');
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      return;
    }
    
    if (isDuplicateFileName(file.name)) {
      alert('A file with this name already exists');
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      return;
    }

    setUploadState('uploading');
    try {
      if (file.type.startsWith("audio/")) {
        const objectURL = URL.createObjectURL(file);
        setAudios({
          id: Date.now(),
          name: file.name,
          src: objectURL,
          author: "",
          metadata: {
            audioPath: objectURL // Store the original path
          }
        });
      }
      setUploadState('success');
      setTimeout(() => {
        setUploadState('idle');
        if (inputFileRef.current) {
          inputFileRef.current.value = '';
        }
      }, 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState('idle');
    }
  };

  const renderUploadButtonContent = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Uploading...</span>
          </>
        );
      case 'success':
        return (
          <>
            <Check className="h-4 w-4" />
            <span>Done!</span>
          </>
        );
      default:
        return (
          <>
            <UploadIcon size={16} />
            <span>Upload Audio</span>
          </>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Audios
      </div>
      <div className="px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <input
          onChange={onInputFileChange}
          ref={inputFileRef}
          type="file"
          className="hidden"
          accept="audio/*"
          disabled={uploadState !== 'idle'}
        />
        <Button
          onClick={() => inputFileRef.current?.click()}
          className="flex w-full gap-2"
          variant="secondary"
          disabled={uploadState !== 'idle' || hasAudioTrack}
        >
          {renderUploadButtonContent()}
        </Button>
      </div>
      <ScrollArea>
        <div className="flex flex-col px-2">
          {filteredAudios.length > 0 ? (
            filteredAudios.map((audio, index) => (
              <AudioItem
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddAudio={handleAddAudio}
                audio={audio}
                key={index}
              />
            ))
          ) : (
            <EmptyAudioState />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

interface AudioItemProps {
  handleAddAudio: (src: string) => void;
  audio: {
    id: number;
    name: string;
    src: string;
    author: string;
    duration?: number;
  };
  shouldDisplayPreview: boolean;
}

const AudioItem = ({
  handleAddAudio,
  audio,
  shouldDisplayPreview,
}: AudioItemProps) => {
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(https://cdn.designcombo.dev/thumbnails/music-preview.png)`,
      backgroundSize: "cover",
      width: "70px",
      height: "70px",
    }),
    [],
  );

  return (
    <Draggable
      data={{ ...audio, details: { src: audio.src } }}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        draggable={false}
        onClick={() => handleAddAudio(audio.src)}
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
        }}
        className="flex cursor-pointer gap-4 px-2 py-1 text-sm hover:bg-zinc-800/70"
      >
        <div className="flex h-12 items-center justify-center bg-zinc-800">
          <Music width={16} />
        </div>
        <div className="flex flex-col justify-center">
          <div>{audio.name}</div>
          <div className="text-zinc-400">{audio.author}</div>
        </div>
      </div>
    </Draggable>
  );
};