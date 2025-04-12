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
  DatabaseIcon
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: <LayoutDashboardIcon className="w-5 h-5 mr-3" /> },
    { path: "/invoices", label: "Invoices", icon: <FileTextIcon className="w-5 h-5 mr-3" /> },
    { path: "/expenses", label: "Expenses", icon: <BanknoteIcon className="w-5 h-5 mr-3" /> },
    { path: "/journals", label: "Journal Entries", icon: <ScaleIcon className="w-5 h-5 mr-3" /> },
    { path: "/deposits", label: "Deposits", icon: <PiggyBankIcon className="w-5 h-5 mr-3" /> },
    { path: "/reports", label: "Reports", icon: <LineChartIcon className="w-5 h-5 mr-3" /> },
    { path: "/chart-of-accounts", label: "Chart of Accounts", icon: <DatabaseIcon className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 w-64 transition duration-300 transform bg-white border-r border-gray-200 md:relative md:translate-x-0 z-30",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Logo section */}
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center space-x-2">
          <BarChart4Icon className="w-8 h-8 text-primary" />
          <span className="text-lg font-semibold text-gray-800">FinLedger</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none md:hidden"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      {/* Navigation links */}
      <nav className="px-2 py-2 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-md",
              location === item.path
                ? "text-white bg-primary"
                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Account section */}
      <div className="absolute bottom-0 w-full border-t border-gray-200">
        <div className="flex items-center px-4 py-3 hover:bg-gray-50">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              JD
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">John Doe</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
