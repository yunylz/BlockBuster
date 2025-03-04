import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId, timeMsToUnits } from "@designcombo/timeline";
import { Icons } from "@/components/shared/icons";
import { Search, FolderOpen, Loader2, Check } from "lucide-react";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import { parseBlocks } from "@/lib/blocks";
import useAssetStore from "@/store/assets";
import { useProjectStore } from "@/store/project";
import { Block } from "@/interfaces/assets";
import { presets } from "../player/animated";
import { isBeatsNotSet, isBpmNotSet } from "@/lib/utils";



const EmptyBlockState = () => (
  <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
    <div className="rounded-full p-6 mb-4 bg-zinc-900">
      <FolderOpen className="w-6 h-6 text-zinc-500" />
    </div>
    <p className="text-base text-zinc-500">No blocks</p>
    <p className="text-sm text-zinc-600">Click the upload button to select blocks.</p>
  </div>
);

export const Blocks = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Use asset store
  const { blocks: storeBlocks, setBlocks: setStoreBlocks } = useAssetStore();
  const [blocks, setBlocks] = useState<Block[]>(storeBlocks);
  const projectStore = useProjectStore();

  const filteredBlocks = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return blocks.filter((block) =>
      block.blockName.toLowerCase().includes(query) || 
      block.bpm.toString().includes(query)
    );
  }, [blocks, searchQuery]);

  // Sync blocks with store when storeBlocks changes
  useEffect(() => {
    setBlocks(storeBlocks);
  }, [storeBlocks]);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    try {
      setUploadState('uploading');

      // Get root folders
      const entries = Array.from(e.target.files);
      const rootFolders = entries
        .filter(file => {
          const pathParts = file.webkitRelativePath.split('/');
          return pathParts.length === 2; // Only direct children of selected folder
        })
        .map(file => file.webkitRelativePath.split('/')[0])
        .filter((value, index, self) => self.indexOf(value) === index); // Unique folders

      // Create FileSystemDirectoryHandle-like objects for parseBlocks
      const folderHandles = rootFolders.map(folderName => {
        const folderFiles = entries.filter(file =>
          file.webkitRelativePath.startsWith(`${folderName}/`)
        );

        return {
          name: folderName,
          getDirectoryHandle: async (subFolder: string) => {
            const subFolderFiles = folderFiles.filter(file =>
              file.webkitRelativePath.startsWith(`${folderName}/${subFolder}/`)
            );

            return {
              getFileHandle: async (fileName: string) => {
                const file = subFolderFiles.find(f =>
                  f.webkitRelativePath.endsWith(`/${fileName}`)
                );
                if (!file) throw new Error(`File ${fileName} not found`);
                return {
                  getFile: async () => file
                };
              }
            };
          }
        };
      });

      const newBlocks = await parseBlocks(folderHandles);
    
      // Update both local state and store
      setBlocks(prev => [...prev, ...newBlocks]);
      newBlocks.forEach(block => setStoreBlocks(block));

      setUploadState('success');
      setTimeout(() => {
        setUploadState('idle');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      }, 2000);
    } catch (error) {
      console.error('Folder selection failed:', error);
      setUploadState('idle');
    }
  };

  const handleAddBlock = (block: Block) => {
    if (isBpmNotSet(projectStore)) return alert("Please set the BPM from settings before proceeding.");
    if (isBeatsNotSet(projectStore)) return alert("To use tracks, an audio must be added to the timeline so that beats can be generated. Please add an audio before proceeding.");
    dispatch(ADD_VIDEO, {
      payload: {
        id: generateId(),
        details: {
          src: block.videoPath,
          title: block.blockName,
        },
        metadata: block,
        animations: {
          in: {
            name: "fadeIn",
            composition: [{
              ...presets.fadeIn,
              durationInFrames: timeMsToUnits(0.7)
            }]
          },
          out: {
            name: "fadeOut",
            composition: [{
              ...presets.fadeOut,
              durationInFrames: timeMsToUnits(0.7)
            }]
          }
        }
      },
      options: {
        resourceId: "main",
        scaleMode: "fit",
      },
    });
  };

  const renderUploadButtonContent = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
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
            <FolderOpen size={16} />
            <span>Select Blocks</span>
          </>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Blocks
      </div>
      <div className="px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks or BPM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFolderSelect}
          // @ts-ignore for webkitdirectory
          webkitdirectory=""
          directory=""
          multiple
          disabled={uploadState !== 'idle'}
        />
        <Button
          onClick={() => inputRef.current?.click()}
          className="flex w-full gap-2"
          variant="secondary"
          disabled={uploadState !== 'idle'}
        >
          {renderUploadButtonContent()}
        </Button>
      </div>
      <ScrollArea>
        <div className="flex flex-col px-2">
          {filteredBlocks.length > 0 ? (
            filteredBlocks
              .sort((a, b) => a.blockName.localeCompare(b.blockName, undefined, { numeric: true }))
              .map((block, index) => (
                <BlockItem
                  key={index}
                  block={block}
                  shouldDisplayPreview={!isDraggingOverTimeline}
                  onSelect={handleAddBlock}
                  projectBpm={projectStore.bpm}
                />
              ))
          ) : (
            <EmptyBlockState />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const BlockItem = ({
  block,
  shouldDisplayPreview,
  onSelect,
  projectBpm,
}: {
  block: Block;
  shouldDisplayPreview: boolean;
  onSelect: (block: Block) => void;
  projectBpm: number;
}) => {
  return (
    <Draggable
      data={{
        id: generateId(),
        details: {
          src: block.videoPath,
          title: block.blockName,
          description: `BPM: ${block.bpm}`,
        },
      }}
      renderCustomPreview={<div className="w-8 h-8 bg-zinc-800 flex items-center justify-center rounded"><FolderOpen className="w-4 h-4" /></div>}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        draggable={false}
        onClick={() => onSelect(block)}
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
        }}
        className="flex cursor-pointer gap-4 px-2 py-1 text-sm hover:bg-zinc-800/70"
      >
        <div className="flex h-12 items-center justify-center bg-zinc-800">
          <Icons.blocks width={16} />
        </div>
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="truncate">{block.blockName}</div>
          {block.bpm === projectBpm ? (
            <div className="text-green-500 truncate flex items-center gap-1">
              <Icons.checkCircle width={20} />
              <span>{block.bpm} BPM</span>
            </div>
          ) : block.bpm === projectBpm - 1 ? (
            <div className="text-blue-400 truncate flex items-center gap-1">
              <Icons.minusCircle width={20} />
              <span>{block.bpm} BPM</span>
            </div>
          ) : block.bpm === projectBpm + 1 ? (
            <div className="text-blue-400 truncate flex items-center gap-1">
              <Icons.plusCircle width={20} />
              <span>{block.bpm} BPM</span>
            </div>
          ) : (
            <div className="text-zinc-400 truncate flex items-center gap-1">
              <span>{block.bpm} BPM</span>
            </div>
          )}
        </div>
      </div>
    </Draggable>
  );
};