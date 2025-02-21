import { Button } from "@/components/ui/button";
import { exportDtape } from "@/lib/uaf";
import useStore from "@/pages/editor/store/use-store";

import { useProjectStore } from "@/store/project";

export default function Export() {
  const trackStore = useStore(); // Get store values inside the component
  const projectStore = useProjectStore();

  const handleExportDtape = () => {
    exportDtape(trackStore, projectStore); // Pass store data to the function
  };

  const handleExportMainSequence = () => {
    //exportDtape()
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
