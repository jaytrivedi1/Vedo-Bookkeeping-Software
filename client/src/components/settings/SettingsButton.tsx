import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsDialog from "./SettingsDialog";

export default function SettingsButton() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Button 
        variant="ghost" 
        className="w-full justify-start py-2 px-3 mt-auto"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings className="mr-2 h-5 w-5" />
        Settings
      </Button>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </>
  );
}