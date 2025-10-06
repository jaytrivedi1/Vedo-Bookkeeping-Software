import { useState } from "react";
import Sidebar from "./Sidebar";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { PlusIcon, MenuIcon } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="relative z-10 flex flex-shrink-0 h-16 glass border-b border-border/50 md:hidden smooth-transition">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-muted-foreground hover:text-foreground smooth-transition focus:outline-none"
            data-testid="button-open-sidebar"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">FinLedger</span>
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
