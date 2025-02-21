import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProjectStore } from '@/store/project';

export const Config = () => {
  const { bpm, setBpm } = useProjectStore();

  const handleBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setBpm(value);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Config
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bpm">Mashup BPM</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="bpm"
              type="number"
              min="1"
              value={bpm}
              onChange={handleBpmChange}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">BPM</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Set the global tempo for your mashup
          </p>
        </div>
      </div>
    </div>
  );
};