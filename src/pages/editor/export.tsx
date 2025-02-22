import { Button } from "@/components/ui/button";
import { exportDtape, exportMusicTrack } from "@/lib/uaf";
import { isTracksEmpty } from "@/lib/utils";
import useStore from "@/pages/editor/store/use-store";

import { useProjectStore } from "@/store/project";

export default function Export() {
  const trackStore = useStore(); // Get store values inside the component
  const projectStore = useProjectStore();

  const doAlert = () => {
    alert("You cannot export a project with no tracks.")
  };

  const handleExportDtape = () => {
    if (isTracksEmpty(trackStore)) return doAlert();
    
    const dtapeData = exportDtape(trackStore, projectStore);

    const blob = new Blob([JSON.stringify(dtapeData)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${projectStore.mapName}_tml_dance.dtape.ckd`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const handleExportMusicTrack = () => {
    if (isTracksEmpty(trackStore)) return doAlert();
    
    const musicTrackData = exportMusicTrack(projectStore);

    const blob = new Blob([JSON.stringify(musicTrackData)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${projectStore.mapName}_musictrack.tpl.ckd`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const handleExportMainSequence = () => {
    if (isTracksEmpty(trackStore)) return doAlert();
    
    const musicTrackData = exportMusicTrack(projectStore);

    const blob = new Blob([JSON.stringify(musicTrackData)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `${projectStore.mapName}_mainsequence.tape.ckd`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="text-lg font-semibold">Export</div>
      <div className="text-xs text-gray-500 mb-2">UAF (JD2016+)</div>
      <div className="border-t border-border my-2"></div>

      <div className="space-y-2">
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={handleExportDtape}>
          Export to Dance Tape
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={handleExportMainSequence}>
          Export to Main Sequence
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={handleExportMusicTrack}>
          Export to Musictrack
        </Button>
      </div>

      <div className="text-xs text-gray-500 mb-2">UAF (2014 / 2015)</div>
      <div className="border-t border-border my-2"></div>

      <div className="space-y-2">
      <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs" 
          onClick={handleExportDtape} 
          disabled
        >
          Export to TPL <span className="ml-2 text-gray-400">(Coming Soon)</span>
        </Button>
      </div>
    </div>
  );
}
