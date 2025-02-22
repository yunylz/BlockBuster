/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dispatch } from "@designcombo/events";
import { HISTORY_UNDO, HISTORY_REDO, DESIGN_RESIZE, DESIGN_LOAD } from "@designcombo/state";
import logoDark from "@/assets/logo-dark.png";
import { Icons } from "@/components/shared/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Download, Loader2 } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { download } from "@/utils/download";
import useAuthStore from "@/store/use-auth-store";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { parseBlocks } from "@/lib/blocks";

import {
  Cloud,
  CreditCard,
  Github,
  Keyboard,
  LifeBuoy,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  PlusCircle,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useStore from "@/pages/editor/store/use-store";
import { generateId } from "@designcombo/timeline";
import Export from "./export";
import { useProjectStore } from "@/store/project";
import { ProjectData } from "@/interfaces/project";
import { empty } from "./data";
import useAssetStore from "@/store/assets";
import { isTracksEmpty } from "@/lib/utils";

const baseUrl = "https://renderer.designcombo.dev";
const size = {
  width: 1080,
  height: 1920,
};
const key = "HxImrg1XuwXwmVh25353xnxqwKzg6r2AHPS8AEH6oDA=";

export default function Navbar() {
  const {
    tracks,
    trackItemIds,
    trackItemsMap,
    trackItemDetailsMap,
    transitionsMap,
    transitionIds,
    fps,
    size
  } = useStore();
  const projectStore = useProjectStore();
  const trackStore = useStore();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [projectToLoad, setProjectToLoad] = useState<ProjectData | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'loading'>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const { setBlocks: setStoreBlocks, clearAudios, clearBlocks } = useAssetStore();

  const doSaveAlert = () => {
    alert("You cannot save a project with no tracks.")
  };

  const handleUndo = () => {
    dispatch(HISTORY_UNDO);
  };

  const handleRedo = () => {
    dispatch(HISTORY_REDO);
  };

  const handleSave = (): void => {
    if (isTracksEmpty(trackStore)) return doSaveAlert();

    const data: ProjectData = {
      id: generateId(),
      fps,
      tracks,
      size,
      trackItemDetailsMap,
      trackItemIds,
      transitionsMap,
      trackItemsMap,
      transitionIds,
      mapName: projectStore.mapName,
      bpm: projectStore.bpm,
      audioLength: projectStore.audioLength,
      beats: projectStore.beats
    };
    console.log("Saving project", data)

    const jsonString = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonString);
    const keyBytes = new TextEncoder().encode(key);
    const encrypted = bytes.map((byte, i) =>
      byte ^ keyBytes[i % keyBytes.length]
    );

    const blob = new Blob([new Uint8Array(encrypted)], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectStore.mapName}.bbs`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const parseProjectFile = async (fileContent: ArrayBuffer): Promise<ProjectData> => {
    const keyBytes = new TextEncoder().encode(key);
    const bytes = new Uint8Array(fileContent);
    const decrypted = bytes.map((byte, i) =>
      byte ^ keyBytes[i % keyBytes.length]
    );
    const jsonString = new TextDecoder().decode(decrypted);
    return JSON.parse(jsonString);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
  
    try {
      setUploadState('loading');
  
      // Get root folders
      const entries = Array.from(e.target.files);
      const rootFolders = entries
        .filter(file => {
          const pathParts = file.webkitRelativePath.split('/');
          return pathParts.length === 2;
        })
        .map(file => file.webkitRelativePath.split('/')[0])
        .filter((value, index, self) => self.indexOf(value) === index);
  
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
  
      const blocks = await parseBlocks(folderHandles);
      
      // Add blocks to store
      blocks.forEach(block => setStoreBlocks(block));
  
      if (projectToLoad) {
        const updatedProjectData = { ...projectToLoad };
        
        updatedProjectData.tracks.forEach((track: any) => {
          track.items.forEach((itemId: string) => {
            const itemData = updatedProjectData.trackItemsMap[itemId];
            if (itemData.type === 'video') {
              const matchingBlock = blocks.find(b => b.blockName === itemData.metadata.blockName);
              if (matchingBlock) {
                updatedProjectData.trackItemsMap[itemId].metadata = matchingBlock;
                updatedProjectData.trackItemDetailsMap[itemId].details.src = matchingBlock.videoPath;
              }
            }
          });
        });
  
        dispatch(DESIGN_LOAD, {
          payload: updatedProjectData,
        });
        projectStore.setAudioLength(projectToLoad.audioLength);
        projectStore.setBpm(projectToLoad.bpm);
        projectStore.setMapName(projectToLoad.mapName);
        projectStore.setBeats(projectToLoad.beats);
      }
      
      setShowFolderDialog(false);
      setProjectToLoad(null);
      setUploadState('idle');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
      setUploadState('idle');
    }
  };

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bbs';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const buffer = await file.arrayBuffer();
      try {
        const projectData = await parseProjectFile(buffer);
        setProjectToLoad(projectData);
        setShowFolderDialog(true);
      } catch (error) {
        console.error('Failed to parse project file:', error);
      }
    };

    input.click();
  };

  const handleClose = () => {
    clearAudios()
    clearBlocks()
    projectStore.setMapName("noMapName")
    projectStore.setBpm(0)
    projectStore.setAudioLength(0)
    projectStore.setBeats([])
    dispatch(DESIGN_LOAD, {
      payload: empty,
    });
  };

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 320px",
        }}
        className="pointer-events-none absolute left-0 right-0 top-0 z-[205] flex h-[72px] items-center px-2"
      >
        {/* Navbar start */}
        <div className="pointer-events-auto flex h-14 items-center gap-2">
          <div className="bg-background h-12 flex items-center gap-2 px-3 rounded-md">
            <img src={logoDark} alt="logo" className="h-5 w-5" />
            <span className="font-medium text-sm">BlockBuster</span>
          </div>
          <div className="flex h-12 items-center bg-background px-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="text-muted-foreground"
                  variant="ghost"
                  size="icon"
                >
                  <Icons.folder width={20} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleOpen}>
                  <Icons.folderOpen className="mr-2 h-4 w-4" />
                  Open
                </DropdownMenuItem>
                <div className="border-t border-border my-2"></div>
                <DropdownMenuItem onClick={handleClose}>
                  <Icons.close className="mr-2 h-4 w-4" />
                  Close
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleSave}
              className="text-muted-foreground"
              variant="ghost"
              size="icon"
            >
              <Icons.save width={20} />
            </Button>
          </div>
          <div className="flex h-12 items-center bg-background px-1.5">
            <Button
              onClick={handleUndo}
              className="text-muted-foreground"
              variant="ghost"
              size="icon"
            >
              <Icons.undo width={20} />
            </Button>
            <Button
              onClick={handleRedo}
              className="text-muted-foreground"
              variant="ghost"
              size="icon"
            >
              <Icons.redo width={20} />
            </Button>
          </div>
        </div>

        {/* Navbar center */}
        <div className="pointer-events-auto flex h-14 items-center justify-center gap-2">
          <div className="flex h-12 items-center gap-4 rounded-md bg-background px-2.5">
            <EditableTitle />
            <ResizeVideo />
          </div>
        </div>

        {/* Navbar end */}
        <div className="pointer-events-auto flex h-14 items-center justify-end gap-2">
          <div className="flex h-12 items-center gap-2 rounded-md bg-background px-2.5">
            <Button
              className="flex gap-2 border border-border"
              onClick={() => window.open("https://discord.gg/ZBA2ddMFr2", "_blank")}
              variant="secondary"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 640 512"
                height={16}
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path>
              </svg>
            </Button>
            <DownloadPopover/>
          </div>
        </div>
      </div>

      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Blocks</DialogTitle>
            <DialogDescription>
              Since BlockBuster is web-based, you need to import all of the blocks (or blocks used in this project) by selecting their folders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-2">
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={handleFolderSelect}
              // @ts-ignore for webkitdirectory
              webkitdirectory=""
              directory=""
              multiple
              disabled={uploadState === 'loading'}
            />
            <Button 
              onClick={() => inputRef.current?.click()}
              className="flex gap-2"
              disabled={uploadState === 'loading'}
            >
              {uploadState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Icons.folder className="h-4 w-4" />
                  <span>Choose Folder</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
const UserMenu = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  if (!user) {
    return (
      <Button
        onClick={() => navigate("/auth")}
        className="flex h-8 gap-1"
        variant="default"
      >
        Sign in
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarImage src={user.avatar} alt="@user" />
          <AvatarFallback>{user.email.slice(0, 2)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="mr-2 mt-2 w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard shortcuts</span>
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Users className="mr-2 h-4 w-4" />
            <span>Team</span>
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <UserPlus className="mr-2 h-4 w-4" />
              <span>Invite users</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Email</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Message</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  <span>More...</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem>
            <Plus className="mr-2 h-4 w-4" />
            <span>New Team</span>
            <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Github className="mr-2 h-4 w-4" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LifeBuoy className="mr-2 h-4 w-4" />
          <span>Support</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Cloud className="mr-2 h-4 w-4" />
          <span>API</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface IDownloadState {
  renderId: string;
  progress: number;
  isDownloading: boolean;
}
const DownloadPopover = () => {
  const [open, setOpen] = useState(false);
  const [downloadState, setDownloadState] = useState<IDownloadState>({
    progress: 0,
    isDownloading: false,
    renderId: "",
  });
  const {
    tracks,
    trackItemIds,
    trackItemsMap,
    trackItemDetailsMap,
    transitionsMap,
    transitionIds,
    fps,
  } = useStore();

  const handleExport = () => {
    const data: any = {
      id: generateId(),
      fps,
      tracks,
      size,
      trackItemDetailsMap,
      trackItemIds,
      transitionsMap,
      trackItemsMap,
      transitionIds,
    };
    console.log(data);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (downloadState.renderId) {
      interval = setInterval(() => {
        fetch(`${baseUrl}/status/${downloadState.renderId}`)
          .then((res) => res.json())
          .then(({ render: { progress, output } }) => {
            if (progress === 100) {
              clearInterval(interval);
              setDownloadState({
                ...downloadState,
                renderId: "",
                progress: 0,
                isDownloading: false,
              });
              download(output, `${downloadState.renderId}`);
              setOpen(false);
            } else {
              setDownloadState({
                ...downloadState,
                progress,
                isDownloading: true,
              });
            }
          });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [downloadState.renderId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="flex h-9 w-9 gap-1 border border-border"
          size="icon"
          variant="secondary"
        >
          <Download width={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] flex w-60 flex-col gap-4">
        {downloadState.isDownloading ? (
          <>
            <Label>Downloading</Label>
            <div className="flex items-center gap-2">
              <Progress
                className="h-2 rounded-sm"
                value={downloadState.progress}
              />
              <div className="rounded-sm border border-border p-1 text-sm text-zinc-400">
                {parseInt(downloadState.progress.toString())}%
              </div>
            </div>
            <div>
              <Button className="w-full">Copy link</Button>
            </div>
          </>
        ) : (
          <Export />
        )}
      </PopoverContent>
    </Popover>
  );
};

interface ResizeOptionProps {
  label: string;
  icon: string;
  value: ResizeValue;
  description: string;
}

interface ResizeValue {
  width: number;
  height: number;
  name: string;
}

const RESIZE_OPTIONS: ResizeOptionProps[] = [
  {
    label: "16:9",
    icon: "landscape",
    description: "Alpha only",
    value: {
      width: 1920,
      height: 1080,
      name: "16:9",
    },
  },
  {
    label: "8:9",
    icon: "landscape",
    description: "1080p Block",
    value: {
      width: 960,
      height: 1080,
      name: "8:9",
    },
  },
  // {
  //   label: "9:16",
  //   icon: "portrait",
  //   description: "Alpha & Mask",
  //   value: {
  //     width: 1080,
  //     height: 1920,
  //     name: "9:16",
  //   },
  // },
  // {
  //   label: "1:1",
  //   icon: "square",
  //   description: "",
  //   value: {
  //     width: 1080,
  //     height: 1080,
  //     name: "1:1",
  //   },
  // },
];

const ResizeVideo = () => {
  const handleResize = (options: ResizeValue) => {
    dispatch(DESIGN_RESIZE, {
      payload: {
        ...options,
      },
    });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="border border-border" variant="secondary">
          Resize
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[250] w-60 px-2.5 py-3">
        <div className="text-sm">
          {RESIZE_OPTIONS.map((option, index) => (
            <ResizeOption
              key={index}
              label={option.label}
              icon={option.icon}
              value={option.value}
              handleResize={handleResize}
              description={option.description}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ResizeOption = ({
  label,
  icon,
  value,
  description,
  handleResize,
}: ResizeOptionProps & { handleResize: (payload: ResizeValue) => void }) => {
  const Icon = Icons[icon as "text"];
  return (
    <div
      onClick={() => handleResize(value)}
      className="flex cursor-pointer items-center rounded-md p-2 hover:bg-zinc-50/10"
    >
      <div className="w-8 text-muted-foreground">
        <Icon size={20} />
      </div>
      <div>
        <div>{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
    </div>
  );
};

const EditableTitle = () => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { mapName, setMapName } = useProjectStore();

  const handleDoubleClick = (): void => {
    setIsEditing(true);
  };

  const handleBlur = (): void => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  return isEditing ? (
    <Input
      value={mapName}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMapName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className="h-8 w-[200px]"
      autoFocus
    />
  ) : (
    <div
      onDoubleClick={handleDoubleClick}
      className="font-medium text-sm px-1 cursor-pointer"
    >
      {mapName}
    </div>
  );
};