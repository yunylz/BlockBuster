import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId, timeMsToUnits } from "@designcombo/timeline";
import { Icons } from "@/components/shared/icons";
import { Search, FolderOpen, Loader2, Check, Upload } from "lucide-react";
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
    <p className="text-sm text-zinc-600">Click the upload button on top to drag & drop blocks.</p>
  </div>
);

export const Blocks = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
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

  const processFiles = async (entries: FileSystemEntry[]) => {
    const processFolderEntry = async (entry: FileSystemDirectoryEntry) => {
      const folderFiles: File[] = [];
      
      const readEntries = async (dirReader: FileSystemDirectoryReader) => {
        return new Promise<FileSystemEntry[]>((resolve) => {
          dirReader.readEntries(async (entries) => {
            if (entries.length === 0) {
              resolve([]);
            } else {
              const moreEntries = await readEntries(dirReader);
              resolve([...entries, ...moreEntries]);
            }
          });
        });
      };

      const processEntry = async (entry: FileSystemEntry, path = '') => {
        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          return new Promise<void>((resolve) => {
            fileEntry.file((file) => {
              // Create a new file with custom path property
              const fileWithPath = Object.defineProperty(file, 'webkitRelativePath', {
                value: `${entry.name}/${path}${file.name}`,
                writable: false
              });
              folderFiles.push(fileWithPath);
              resolve();
            });
          });
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry;
          const dirReader = dirEntry.createReader();
          const entries = await readEntries(dirReader);
          
          const promises = entries.map((childEntry) => {
            return processEntry(childEntry, `${path}${childEntry.isDirectory ? childEntry.name + '/' : ''}`);
          });
          
          await Promise.all(promises);
        }
      };
      
      await processEntry(entry);
      
      return {
        name: entry.name,
        files: folderFiles
      };
    };

    const folderEntries = entries.filter(entry => entry.isDirectory) as FileSystemDirectoryEntry[];
    
    if (folderEntries.length === 0) {
      console.warn('No folders found in the dropped items');
      return [];
    }

    const processedFolders = await Promise.all(folderEntries.map(processFolderEntry));
    
    // Create FileSystemDirectoryHandle-like objects for parseBlocks
    const folderHandles = processedFolders.map(folder => {
      return {
        name: folder.name,
        getDirectoryHandle: async (subFolder: string) => {
          const subFolderFiles = folder.files.filter(file =>
            file.webkitRelativePath.includes(`/${subFolder}/`)
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

    return folderHandles;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (uploadState === 'uploading') return;
    
    try {
      setUploadState('uploading');
      
      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;
      
      const entries: FileSystemEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry();
        if (entry) entries.push(entry);
      }
      
      const folderHandles = await processFiles(entries);
      
      if (folderHandles.length === 0) {
        setUploadState('idle');
        return;
      }
      
      const newBlocks = await parseBlocks(folderHandles);
      
      // Update both local state and store
      setBlocks(prev => [...prev, ...newBlocks]);
      newBlocks.forEach(block => setStoreBlocks(block));
      
      setUploadState('success');
      setTimeout(() => {
        setUploadState('idle');
      }, 2000);
    } catch (error) {
      console.error('Folder drop handling failed:', error);
      setUploadState('idle');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
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

  const renderUploadStatus = () => {
    switch (uploadState) {
      case 'uploading':
        return (
          <div className="text-zinc-300 flex items-center gap-2 bg-zinc-800 rounded px-3 py-1.5 mt-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Processing folders...</span>
          </div>
        );
      case 'success':
        return (
          <div className="text-green-400 flex items-center gap-2 bg-green-900/20 rounded px-3 py-1.5 mt-1">
            <Check className="h-4 w-4" />
            <span className="text-sm">Blocks added successfully!</span>
          </div>
        );
      default:
        return null;
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
        
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center p-4 transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-500/10' 
              : 'border-zinc-700 hover:border-zinc-500'
          }`}
        >
          <Upload className={`h-6 w-6 mb-2 ${isDragOver ? 'text-blue-400' : 'text-zinc-400'}`} />
          <p className="text-sm text-center">
            {isDragOver 
              ? 'Drop folders here' 
              : 'Drag and drop folders here'}
          </p>
          <p className="text-xs text-zinc-500 text-center mt-1">
            Only folders containing block files will be processed
          </p>
        </div>
        
        {renderUploadStatus()}
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