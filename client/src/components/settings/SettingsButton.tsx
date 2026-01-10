import { Link, useLocation } from "wouter";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsButton() {
  const [location] = useLocation();
  const isActive = location.startsWith("/settings");

  return (
    <Link href="/settings">
      <Button
        variant="ghost"
        className={`w-full justify-start py-2 px-3 mt-auto ${
          isActive ? "bg-slate-100 text-primary" : ""
        }`}
      >
        <Settings className="mr-2 h-5 w-5" />
        Settings
      </Button>
    </Link>
  );
}
