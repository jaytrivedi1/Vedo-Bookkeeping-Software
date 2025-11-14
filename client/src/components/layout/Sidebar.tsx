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
  SettingsIcon
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
    { path: "/", label: "Dashboard", icon: <LayoutDashboardIcon className="w-5 h-5 mr-3" /> },
    { path: "/banking", label: "Banking", icon: <BuildingIcon className="w-5 h-5 mr-3" /> },
    { path: "/invoices", label: "Invoices", icon: <FileTextIcon className="w-5 h-5 mr-3" /> },
    { path: "/expenses", label: "Expenses", icon: <BanknoteIcon className="w-5 h-5 mr-3" /> },
    { path: "/account-books", label: "Account Books", icon: <BookOpenIcon className="w-5 h-5 mr-3" /> },
    { path: "/chart-of-accounts", label: "Chart of Accounts", icon: <DatabaseIcon className="w-5 h-5 mr-3" /> },
    { path: "/sales-taxes", label: "Sales Taxes", icon: <PercentIcon className="w-5 h-5 mr-3" /> },
    { path: "/products", label: "Products & Services", icon: <PackageIcon className="w-5 h-5 mr-3" /> },
    { path: "/fx-revaluation", label: "FX Revaluation", icon: <TrendingUpIcon className="w-5 h-5 mr-3" /> },
    { path: "/reports", label: "Reports", icon: <LineChartIcon className="w-5 h-5 mr-3" /> },
    { path: "/settings", label: "Settings", icon: <SettingsIcon className="w-5 h-5 mr-3" /> },
  ];

  // Add Admin Dashboard for admin users only
  const menuItems = user?.role === 'admin' 
    ? [...baseMenuItems, { path: "/admin", label: "Admin Dashboard", icon: <ShieldIcon className="w-5 h-5 mr-3" /> }]
    : baseMenuItems;
  
  const transactionTypes = [
    { path: "/invoices/new", label: "Invoice", icon: <FileTextIcon className="w-4 h-4 mr-2" /> },
    { path: "/expenses/new", label: "Expense", icon: <BanknoteIcon className="w-4 h-4 mr-2" /> },
    { path: "/journals/new", label: "Journal Entry", icon: <ScaleIcon className="w-4 h-4 mr-2" /> },
    { path: "/deposits/new", label: "Deposit", icon: <PiggyBankIcon className="w-4 h-4 mr-2" /> },
    { path: "/pay-bill", label: "Pay Bill", icon: <DollarSignIcon className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 w-64 transition-all duration-300 transform glass border-r border-border/50 md:relative md:translate-x-0 z-30 flex flex-col",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo section */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-border/30">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg glow">
            <BarChart4Icon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Vedo
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground smooth-transition focus:outline-none md:hidden"
          data-testid="button-close-sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      {/* Company selector */}
      <div className="px-4 py-3">
        <CompanySelector />
      </div>

      {/* Navigation links */}
      <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg smooth-transition group",
              location === item.path
                ? "text-white bg-gradient-to-r from-primary to-accent shadow-md glow"
                : "text-foreground hover:text-primary hover:bg-muted/50"
            )}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            {item.icon}
            <span className={cn(location === item.path && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        ))}
        
        {/* New Transaction Dropdown */}
        <div className="mt-4 px-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="w-full justify-start bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 border-primary/20 hover:border-primary/40 smooth-transition" 
                variant="outline"
                data-testid="button-new-transaction-sidebar"
              >
                <PlusIcon className="w-5 h-5 mr-3" />
                New Transaction
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 glass-card border-border/50">
              {transactionTypes.map((type) => (
                <Link key={type.path} href={type.path}>
                  <DropdownMenuItem className="cursor-pointer smooth-transition hover:bg-primary/10" data-testid={`menu-item-${type.label.toLowerCase().replace(/\s/g, '-')}`}>
                    {type.icon}
                    {type.label}
                  </DropdownMenuItem>
                </Link>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Settings and Account section */}
      <div className="border-t border-border/30 mt-auto">
        <div className="px-3 py-3">
          <SettingsButton />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center px-4 py-3 hover:bg-muted/30 border-t border-border/30 smooth-transition group cursor-pointer" data-testid="user-profile-section">
              <div className="flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-md glow-hover smooth-transition group-hover:scale-110">
                  {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                  {user?.lastName?.[0] || ''}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.username || 'User'}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role || 'User'}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card border-border/50">
            <DropdownMenuItem 
              onClick={() => logout()} 
              className="cursor-pointer smooth-transition hover:bg-destructive/10 text-destructive"
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
