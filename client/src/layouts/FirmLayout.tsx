import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface FirmLayoutProps {
  children: React.ReactNode;
}

interface FirmData {
  id: number;
  name: string;
}

const firmNavItems = [
  {
    title: "Dashboard",
    href: "/firm/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Firm Books",
    href: "/firm/books",
    icon: BookOpen,
  },
  {
    title: "Clients",
    href: "/firm/clients",
    icon: Building2,
  },
  {
    title: "Team",
    href: "/firm/team",
    icon: Users,
  },
  {
    title: "Settings",
    href: "/firm/settings",
    icon: Settings,
  },
];

export default function FirmLayout({ children }: FirmLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  // Fetch firm details
  const { data: firm } = useQuery<FirmData>({
    queryKey: ["/api/firms", user?.firmId],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${user?.firmId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch firm");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const NavContent = () => (
    <>
      {/* Logo Section */}
      <div className="flex items-center h-16 px-4 border-b border-purple-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white">Vedo</span>
              <span className="text-xs text-purple-300">Accounting Firm</span>
            </div>
          )}
        </div>
      </div>

      {/* Firm Name */}
      {sidebarOpen && firm && (
        <div className="px-4 py-3 border-b border-purple-800/30">
          <p className="text-sm text-purple-300">Logged in as</p>
          <p className="font-medium text-white truncate">{firm.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {firmNavItems.map((item) => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <button
              key={item.href}
              onClick={() => {
                setLocation(item.href);
                setMobileOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                isActive
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-purple-200 hover:bg-purple-800/50 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left">{item.title}</span>
                  {isActive && <ChevronRight className="w-4 h-4" />}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-purple-800/30">
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg",
          sidebarOpen ? "bg-purple-800/30" : ""
        )}>
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium text-sm">
            {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email}
              </p>
              <p className="text-xs text-purple-300">Firm Admin</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full mt-2 text-purple-200 hover:text-white hover:bg-purple-800/50",
            !sidebarOpen && "justify-center px-2"
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          {sidebarOpen && <span className="ml-2">Sign Out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-gradient-to-b from-purple-900 to-purple-950 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        <NavContent />

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-20 -right-3 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-purple-500 transition-colors"
          style={{ left: sidebarOpen ? "248px" : "68px" }}
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 to-purple-950 transform transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-purple-300 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center h-16 px-4 bg-white border-b shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">Vedo</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
