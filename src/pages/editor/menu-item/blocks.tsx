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
  const [showDropZone, setShowDropZone] = useState(false);
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

  // Event handlers
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
    <div className="flex flex-1 flex-col h-full">
      <div className="text-text-primary flex h-12 flex-none items-center justify-between px-4 text-sm font-medium">
        <span>Blocks</span>
        <button
          onClick={() => setShowDropZone(!showDropZone)}
          className="text-zinc-400 hover:text-zinc-200 focus:outline-none pr-8"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 pb-2 space-y-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blocks or BPM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Collapsible drop zone */}
        {showDropZone && (
          <>
            <div
              ref={dropZoneRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-md flex flex-col items-center justify-center p-2 transition-colors ${isDragOver
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 hover:border-zinc-500'
                }`}
            >
              <Upload className={`h-4 w-4 mb-1 ${isDragOver ? 'text-blue-400' : 'text-zinc-400'}`} />
              <p className="text-xs text-center">
                {isDragOver
                  ? 'Drop folders here'
                  : 'Drag and drop folders here'}
              </p>
            </div>
            {renderUploadStatus()}
          </>
        )}
      </div>

      <div className="flex-grow overflow-auto">
        <ScrollArea className="h-full">
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
  const [thumbnailError, setThumbnailError] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [duration, setDuration] = useState('0:00');
  const itemRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Format seconds to MM:SS format
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Use a specific thumbnail creation approach using a video element
  useEffect(() => {
    // Create a video element to capture the thumbnail
    if (videoRef.current) {
      videoRef.current.currentTime = 0.1;
    }
  }, [block.videoPath]);

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
        ref={itemRef}
        draggable={false}
        onClick={() => onSelect(block)}
        onMouseEnter={() => setShowPreview(false)}
        onMouseLeave={() => setShowPreview(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr",
        }}
        className="flex cursor-pointer gap-4 px-2 py-1 text-sm hover:bg-zinc-800/70 relative"
      >
        {/* Thumbnail container */}
        <div className="flex h-12 items-center justify-center bg-zinc-800 overflow-hidden">

            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="8" height="8" rx="1" />
              <rect x="14" y="2" width="8" height="8" rx="1" />
              <rect x="2" y="14" width="8" height="8" rx="1" />
              <rect x="14" y="14" width="8" height="8" rx="1" />
            </svg>
        </div>

        {/* Block info */}
        <div className="flex flex-col justify-center overflow-hidden">
          <div className="truncate">{block.blockName}</div>
          {block.bpm === projectBpm ? (
            <div className="text-green-500 truncate flex items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>{block.bpm} BPM</span>
            </div>
          ) : block.bpm === projectBpm - 1 ? (
            <div className="text-blue-400 truncate flex items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <span>{block.bpm} BPM</span>
            </div>
          ) : block.bpm === projectBpm + 1 ? (
            <div className="text-blue-400 truncate flex items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              <span>{block.bpm} BPM</span>
            </div>
          ) : (
            <div className="text-zinc-400 truncate flex items-center gap-1">
              <span>{block.bpm} BPM</span>
            </div>
          )}
        </div>

        {/* Hover preview popup */}
        {showPreview && (
          <div
            className="fixed z-50 bg-zinc-900 border border-zinc-700 shadow-xl rounded-md overflow-hidden"
            style={{
              width: '240px',
              left: itemRef.current ?
                itemRef.current.getBoundingClientRect().left +
                (itemRef.current.getBoundingClientRect().width / 2) - 120 : 0,
              top: itemRef.current ?
                itemRef.current.getBoundingClientRect().top - 180 : 0,
            }}
          >
            <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
              <video
                ref={previewVideoRef}
                src={block.videoPath}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                autoPlay
                loop
                playsInline
              />
            </div>
            <div className="p-3">
              <div className="font-medium mb-1">{block.blockName}</div>
              <div className="flex justify-between text-xs text-zinc-400">
                <span>{block.bpm} BPM</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
};