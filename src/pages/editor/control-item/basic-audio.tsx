import { ScrollArea } from "@/components/ui/scroll-area";
import { IAudio, ITrackItem } from "@designcombo/types";
import Volume from "./common/volume";
import Speed from "./common/speed";
import { useRef, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, LAYER_REPLACE } from "@designcombo/state";
import { Button } from "@/components/ui/button";

const BasicAudio = ({ trackItem }: { trackItem: ITrackItem & IAudio }) => {
  const [properties, setProperties] = useState(trackItem);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChangeVolume = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          details: {
            volume: v,
          },
        },
      },
    });
    setProperties((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        volume: v,
      },
    }));
  };

  const handleChangeSpeed = (v: number) => {
    dispatch(EDIT_OBJECT, {
      payload: {
        [trackItem.id]: {
          playbackRate: v,
        },
      },
    });
    setProperties((prev) => ({
      ...prev,
      playbackRate: v,
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert("Please select an audio file.");
        return;
      }

      // Create a URL for the selected file
      const audioUrl = URL.createObjectURL(file);

      dispatch(LAYER_REPLACE, {
        payload: {
          [trackItem.id]: {
            details: {
              src: audioUrl,
            },
          },
        },
      });

      // Update local state
      setProperties((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          src: audioUrl,
        },
      }));

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      console.log("audio replaced")
    }
  };

  const handleReplace = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Audio
      </div>
      <ScrollArea className="h-full">
        <div className="px-4 space-y-2">
          <input 
            type="file" 
            ref={fileInputRef}
            accept="audio/*"
            className="hidden" 
            onChange={handleFileSelect}
          />
          <Button onClick={handleReplace} variant="secondary" size="lg" className="w-full">
            Replace Audio
          </Button>
          <Volume
            onChange={(v: number) => handleChangeVolume(v)}
            value={properties.details.volume!}
          />
          <Speed
            value={properties.playbackRate!}
            onChange={handleChangeSpeed}
          />
        </div>
      </ScrollArea>
    </div>
  );
};

export default BasicAudio;