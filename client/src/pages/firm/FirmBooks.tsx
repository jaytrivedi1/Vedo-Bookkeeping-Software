import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  BookOpen,
  ArrowRight,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

interface ClientAccess {
  id: number;
  firmId: number;
  companyId: number;
  isActive: boolean;
  isOwnCompany: boolean;
  billingType: string;
  company: {
    id: number;
    name: string;
  };
}

export default function FirmBooks() {
  const { user, switchCompany } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [switching, setSwitching] = useState(false);

  // Fetch client access list to find own company
  const { data: clientAccess = [], isLoading } = useQuery<ClientAccess[]>({
    queryKey: ["/api/firms", user?.firmId, "clients"],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${user?.firmId}/clients`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Find the firm's own company
  const ownCompany = clientAccess.find(c => c.isOwnCompany);

  const handleOpenBooks = async () => {
    if (!ownCompany) return;

    try {
      setSwitching(true);
      await switchCompany(ownCompany.companyId);
      setLocation(`/`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to open books",
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Firm Books</h1>
        <p className="text-slate-500 mt-1">
          Manage your accounting firm's own finances
        </p>
      </div>

      {/* Main Card */}
      <Card className="border-2 border-sky-100 bg-gradient-to-br from-sky-50 to-white">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-100 rounded-xl">
              <BookOpen className="h-8 w-8 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {ownCompany?.company.name || "Firm Books"}
              </CardTitle>
              <CardDescription>
                Track your firm's income, expenses, and financial health
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats Preview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <FileText className="h-4 w-4" />
                <span className="text-sm">Invoices</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">--</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Receipt className="h-4 w-4" />
                <span className="text-sm">Expenses</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">--</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Bank Balance</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">--</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Profit</span>
              </div>
              <p className="text-2xl font-semibold text-slate-900">--</p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-sky-50/50 rounded-lg p-4">
            <p className="text-slate-600">
              Your firm's bookkeeping is managed separately from your client companies.
              Open your books to create invoices for clients, track expenses, manage bank accounts,
              and run financial reports for your accounting practice.
            </p>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleOpenBooks}
              disabled={switching || !ownCompany}
              className="bg-sky-600 hover:bg-sky-700"
            >
              {switching ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Opening...
                </>
              ) : (
                <>
                  Open My Books
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Why Keep Separate Books?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-600">
            <p>
              <strong>Clear Separation:</strong> Keep your firm's finances distinct from client work
              for accurate reporting and compliance.
            </p>
            <p>
              <strong>Billing Clarity:</strong> Track which services are billable to clients
              versus firm overhead expenses.
            </p>
            <p>
              <strong>Tax Preparation:</strong> Have organized records ready for your
              own tax filings and financial planning.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What You Can Track</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-slate-600">
            <p>
              <strong>Client Invoices:</strong> Bill clients for your accounting services
              and track payments.
            </p>
            <p>
              <strong>Operating Expenses:</strong> Software subscriptions, office supplies,
              professional development, and more.
            </p>
            <p>
              <strong>Financial Reports:</strong> Generate P&L statements, balance sheets,
              and cash flow reports for your practice.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
