import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadIcon, Loader2, Check } from "lucide-react";
import { useRef, useState } from "react";
import useAssetStore from "@/store/assets";

export const Uploads = () => {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const setAudios = useAssetStore((state) => state.setAudios);
  const audios = useAssetStore((state) => state.audios);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success'>('idle');

  const isDuplicateFileName = (fileName: string) => {
    return audios.some(audio => audio.name === fileName);
  };

  const onInputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const file = e.target.files[0];

    if (isDuplicateFileName(file.name)) {
      alert('A file with this name already exists');
      if (inputFileRef.current) {
        inputFileRef.current.value = '';
      }
      return;
    }
    
    setUploadState('uploading');
    
    try {
      const objectURL = URL.createObjectURL(file);
      
      if (file.type.startsWith("audio/")) {
        setAudios({
          id: Date.now(),
          name: file.name,
          src: objectURL,
          author: "Unknown",
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

  const renderButtonContent = () => {
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
            <span>Upload</span>
          </>
        );
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Your media
      </div>
      <input
        onChange={onInputFileChange}
        ref={inputFileRef}
        type="file"
        className="hidden"
        accept="image/*,audio/*,video/*"
        disabled={uploadState !== 'idle'}
      />
      <div className="px-4 py-2">
        <div>
          <Button
            onClick={() => inputFileRef.current?.click()}
            className="flex w-full gap-2"
            variant="secondary"
            disabled={uploadState !== 'idle'}
          >
            {renderButtonContent()}
          </Button>
        </div>
      </div>
      <ScrollArea>
        <div className="masonry-sm px-4"></div>
      </ScrollArea>
    </div>
  );
};