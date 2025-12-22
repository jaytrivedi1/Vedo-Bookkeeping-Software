import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number; // Optional badge count
}

interface WorkspaceTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Ghost Tab styled navigation component
 * Active tab indicated by bold font and indigo bottom border
 */
export default function WorkspaceTabs({
  tabs,
  activeTab,
  onTabChange,
  className,
}: WorkspaceTabsProps) {
  return (
    <div className={cn("border-b border-slate-200", className)}>
      <nav className="flex gap-1" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-t-lg",
                isActive
                  ? "text-indigo-700 font-semibold"
                  : "text-slate-500 hover:text-slate-700"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full min-w-[18px]",
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
              {/* Active indicator - bottom border */}
              {isActive && (
                <span
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-600 rounded-full"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
