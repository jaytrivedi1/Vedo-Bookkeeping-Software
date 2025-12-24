import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart4Icon,
  FileTextIcon,
  BanknoteIcon,
  ScaleIcon,
  PiggyBankIcon,
  LayoutDashboardIcon,
  LineChartIcon,
  DatabaseIcon,
  BookOpenIcon,
  BuildingIcon,
  PlusIcon,
  PercentIcon,
  PackageIcon,
  ShoppingBagIcon,
  DollarSignIcon,
  LogOutIcon,
  TrendingUpIcon,
  ShieldIcon,
  ClipboardListIcon,
  ChevronDownIcon,
  XIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import SettingsButton from "@/components/settings/SettingsButton";
import { CompanySelector } from "@/components/layout/CompanySelector";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const baseMenuItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboardIcon className="w-5 h-5" /> },
    { path: "/banking", label: "Banking", icon: <BuildingIcon className="w-5 h-5" /> },
    { path: "/invoices", label: "Invoices", icon: <FileTextIcon className="w-5 h-5" /> },
    { path: "/expenses", label: "Expenses", icon: <BanknoteIcon className="w-5 h-5" /> },
    { path: "/account-books", label: "Account Books", icon: <BookOpenIcon className="w-5 h-5" /> },
    { path: "/chart-of-accounts", label: "Chart of Accounts", icon: <DatabaseIcon className="w-5 h-5" /> },
    { path: "/sales-taxes", label: "Sales Taxes", icon: <PercentIcon className="w-5 h-5" /> },
    { path: "/products", label: "Products & Services", icon: <PackageIcon className="w-5 h-5" /> },
    { path: "/fx-revaluation", label: "FX Revaluation", icon: <TrendingUpIcon className="w-5 h-5" /> },
    { path: "/activity-log", label: "Activity Log", icon: <ClipboardListIcon className="w-5 h-5" /> },
    { path: "/reports", label: "Reports", icon: <LineChartIcon className="w-5 h-5" /> },
  ];

  // Add Admin Dashboard for admin users only
  const menuItems = user?.role === 'admin'
    ? [...baseMenuItems, { path: "/admin", label: "Admin Dashboard", icon: <ShieldIcon className="w-5 h-5" /> }]
    : baseMenuItems;

  const transactionTypes = [
    { path: "/invoices/new", label: "Invoice", icon: <FileTextIcon className="w-4 h-4 mr-2" /> },
    { path: "/quotations/new", label: "Quotation", icon: <FileTextIcon className="w-4 h-4 mr-2" /> },
    { path: "/expenses/new", label: "Expense", icon: <BanknoteIcon className="w-4 h-4 mr-2" /> },
    { path: "/journals/new", label: "Journal Entry", icon: <ScaleIcon className="w-4 h-4 mr-2" /> },
    { path: "/deposits/new", label: "Deposit", icon: <PiggyBankIcon className="w-4 h-4 mr-2" /> },
    { path: "/pay-bill", label: "Pay Bill", icon: <DollarSignIcon className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 w-64 transition-all duration-300 transform md:relative md:translate-x-0 z-30 flex flex-col",
        "bg-slate-900 text-white",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo section */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center shadow-lg">
            <BarChart4Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Vedo
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none md:hidden"
          data-testid="button-close-sidebar"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Company selector */}
      <div className="px-4 py-3 border-b border-slate-700/50">
        <CompanySelector />
      </div>

      {/* Navigation links */}
      <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const isActive = location === item.path ||
            (item.path !== "/" && location.startsWith(item.path));

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <span className={cn(
                "flex-shrink-0",
                isActive ? "text-white" : "text-slate-400"
              )}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Settings and Account section */}
      <div className="border-t border-slate-700/50 mt-auto">
        <div className="px-3 py-3">
          <SettingsButton />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className="flex items-center px-4 py-3 hover:bg-slate-800 border-t border-slate-700/50 transition-colors cursor-pointer"
              data-testid="user-profile-section"
            >
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                  {user?.lastName?.[0] || ''}
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.username || 'User'}
                </p>
                <p className="text-xs text-slate-400 capitalize">{user?.role || 'User'}</p>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-slate-400 ml-2" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg">
            <DropdownMenuItem
              onClick={() => logout()}
              className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              data-testid="button-logout"
            >
              <LogOutIcon className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
