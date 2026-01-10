import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Building2,
  User,
  Sun,
  FileText,
  DollarSign,
  Users,
  Briefcase,
  ChevronDown,
  Settings,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface SettingsLayoutProps {
  children: ReactNode;
}

const navItems = [
  {
    id: "company",
    label: "Company",
    icon: Building2,
    href: "/settings/company",
    description: "Company details and branding",
  },
  {
    id: "account",
    label: "Account",
    icon: User,
    href: "/settings/account",
    description: "Password and profile",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: Sun,
    href: "/settings/preferences",
    description: "Theme and AI settings",
  },
  {
    id: "invoices",
    label: "Invoices",
    icon: FileText,
    href: "/settings/invoices",
    description: "Invoice templates",
  },
  {
    id: "emails",
    label: "Emails & Reminders",
    icon: Mail,
    href: "/settings/emails",
    description: "Email templates & automation",
  },
  {
    id: "currency",
    label: "Currency",
    icon: DollarSign,
    href: "/settings/currency",
    description: "Multi-currency setup",
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    href: "/settings/users",
    description: "User management",
  },
  {
    id: "accountant",
    label: "Accountant",
    icon: Briefcase,
    href: "/settings/accountant",
    description: "Accounting firm access",
  },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [location] = useLocation();

  // Determine active section from URL
  const activeSection = navItems.find((item) => location.startsWith(item.href))?.id || "company";
  const activeItem = navItems.find((item) => item.id === activeSection);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-slate-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account and company settings</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-slate-100 min-h-[calc(100vh-81px)]">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <Link key={item.id} href={item.href}>
                  <a
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-slate-50",
                      isActive
                        ? "bg-sky-50 text-sky-700 border-l-2 border-sky-600 -ml-[2px] pl-[14px]"
                        : "text-slate-600"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", isActive ? "text-sky-600" : "text-slate-400")} />
                    <span>{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden w-full bg-white border-b border-slate-200 px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  {activeItem && <activeItem.icon className="h-4 w-4" />}
                  {activeItem?.label || "Select Section"}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[calc(100vw-32px)]" align="start">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <Link key={item.id} href={item.href}>
                    <DropdownMenuItem
                      className={cn(
                        "flex items-center gap-3 py-3 cursor-pointer",
                        isActive && "bg-sky-50 text-sky-700"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-sky-600" : "text-slate-400")} />
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </DropdownMenuItem>
                  </Link>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8">
          <div className="max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
