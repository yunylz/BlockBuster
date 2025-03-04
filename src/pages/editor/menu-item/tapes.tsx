import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { generateId } from "@designcombo/timeline";
import Draggable from "@/components/shared/draggable";
import { IImage } from "@designcombo/types";
import React, { useState } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { ADD_ITEMS } from "@designcombo/state";
import { ChevronDown, ChevronRight } from "lucide-react";
import { isBeatsNotSet, isBpmNotSet } from "@/lib/utils";
import { useProjectStore } from "@/store/project";

type CategoryKey = 'backgrounds';

interface TapeItemData {
  preview: string;
  details: {
    src: string;
  };
}

interface TapeCategory {
  title: string;
  tapes: TapeItemData[];
}

type ExpandedCategories = {
  [key: string]: boolean;
}

const TAPE_CATEGORIES: Record<CategoryKey, TapeCategory> = {
  backgrounds: {
    title: "Backgrounds",
    tapes: [
      {
        preview: "/src/assets/bkgs/blue.png",
        details: { src: "/src/assets/bkgs/blue.png" }
      },
      {
        preview: "/src/assets/bkgs/green.png",
        details: { src: "/src/assets/bkgs/green.png" }
      },
      {
        preview: "/src/assets/bkgs/purple.png",
        details: { src: "/src/assets/bkgs/purple.png" }
      },
      {
        preview: "/src/assets/bkgs/orange.png",
        details: { src: "/src/assets/bkgs/orange.png" }
      }
    ]
  }
};

export const Tapes = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [expandedCategories, setExpandedCategories] = useState<ExpandedCategories>({
    backgrounds: true
  });

  const projectStore = useProjectStore();

  const handleAddTape = (payload: Partial<IImage>) => {
    if (isBpmNotSet(projectStore)) return alert("Please set the BPM from settings before proceeding.");
    if (isBeatsNotSet(projectStore)) return alert("To use tracks, an audio must be added to the timeline so that beats can be generated. Please add an audio before proceeding.");
    const id = generateId();
    
    // Extract the filename from the src path
    const src = payload.details?.src || '';
    const filename = src.split('/').pop() || '';
    
    // Remove the file extension if needed
    const name = filename.replace(/\.[^/.]+$/, '');
    
    dispatch(ADD_ITEMS, {
      payload: {
        trackItems: [
          {
            id,
            type: "image",
            display: {
              from: 0,
              to: 5000,
            },
            details: {
              src: payload.details?.src,
            },
            metadata: {
              tapeName: name, // Add the extracted name to metadata
            },
          },
        ],
      },
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Tapes
      </div>
      <ScrollArea>
        <div className="flex flex-col gap-2 p-4">
          {Object.entries(TAPE_CATEGORIES).map(([key, category]) => (
            <div key={key} className="rounded-lg border border-border">
              <button
                onClick={() => toggleCategory(key)}
                className="flex w-full items-center justify-between p-3 hover:bg-accent"
              >
                <span className="font-medium">{category.title}</span>
                {expandedCategories[key] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {expandedCategories[key] && (
                <div className="grid grid-cols-3 gap-2 p-3 pt-0">
                  {category.tapes.map((tape, index) => (
                    <TapeItem
                      key={index}
                      tape={tape}
                      shouldDisplayPreview={!isDraggingOverTimeline}
                      handleAddTape={handleAddTape}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const TapeItem = ({
  handleAddTape,
  tape,
  shouldDisplayPreview,
}: {
  handleAddTape: (payload: Partial<IImage>) => void;
  tape: TapeItemData;
  shouldDisplayPreview: boolean;
}) => {
  const style = React.useMemo(
    () => ({
      backgroundImage: `url(${tape.preview})`,
      backgroundSize: "cover",
      width: "80px",
      height: "80px",
    }),
    [tape.preview],
  );

  return (
    <Draggable
      data={tape}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <button
        type="button"
        onClick={() =>
          handleAddTape({
            id: generateId(),
            details: {
              src: tape.details.src,
            },
          } as IImage)
        }
        className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-md bg-background hover:bg-accent"
      >
        <img
          draggable={false}
          src={tape.preview}
          className="h-full w-full object-cover"
          alt="tape preview"
        />
      </button>
    </Draggable>
  );
};