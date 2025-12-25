import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { format } from "date-fns";
import {
  PlusIcon,
  FileText,
  CreditCard,
  PiggyBank,
  Receipt,
  FileSignature,
  Pause,
  Play,
  Trash2,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  Printer,
  Mail,
  X
} from "lucide-react";
import TransactionTable from "@/components/dashboard/TransactionTable";
import CustomerDialog from "@/components/customers/CustomerDialog";
import CustomerList from "@/components/customers/CustomerList";
import SalesReceiptForm from "@/components/forms/SalesReceiptForm";
import { PeriodSelector, ActiveFilterIndicator } from "@/components/PeriodSelector";
import { usePeriodFilter } from "@/hooks/usePeriodFilter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Transaction, RecurringTemplate, CompanySettings } from "@shared/schema";
import { formatCurrency } from "@/lib/currencyUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Preferences {
  homeCurrency?: string;
}

interface CompanySettingsResponse extends CompanySettings {
  fiscalYearStartMonth?: number;
}

export default function Invoices() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchString = useSearch();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [salesReceiptDialogOpen, setSalesReceiptDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Read tab from URL query parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const tabParam = params.get('tab');
    if (tabParam && ['invoices', 'quotations', 'recurring', 'sales-receipts', 'customers'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchString]);
  const [selectedRecurringIds, setSelectedRecurringIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  // Fetch all transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch recurring templates
  const { data: recurringTemplates = [], isLoading: recurringLoading } = useQuery<RecurringTemplate[]>({
    queryKey: ['/api/recurring'],
  });

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });

  // Fetch company settings for fiscal year
  const { data: companySettings } = useQuery<CompanySettingsResponse>({
    queryKey: ['/api/settings/company'],
  });

  // Period filter hook
  const {
    period,
    setPeriod,
    customRange,
    setCustomRange,
    periodLabel,
    isFiltered,
    filterByPeriod,
    clearFilter,
  } = usePeriodFilter({
    fiscalYearStartMonth: companySettings?.fiscalYearStartMonth || 1,
  });

  // Recurring template mutations
  const pauseMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring/${id}/pause`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template paused" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring/${id}/resume`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template resumed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template deleted" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/recurring/${id}/run-now`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Invoice generated" });
    },
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  // Helper function to check if an invoice is overdue based on due date (not status field)
  // Memoized with useCallback to prevent unnecessary recalculations
  const isOverdue = useCallback((invoice: Transaction): boolean => {
    // Must have a due date to be overdue
    if (!invoice.dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    // Not overdue if due date is today or in the future
    if (dueDate >= today) return false;

    // Must have an unpaid balance
    const balance = invoice.balance ?? invoice.amount;
    if (balance <= 0) return false;

    // Exclude paid, completed, cancelled, and quotation statuses
    const nonOverdueStatuses = ['paid', 'completed', 'cancelled', 'quotation'];
    if (nonOverdueStatuses.includes(invoice.status)) return false;

    return true;
  }, []);

  // Filter invoices (excluding quotations)
  const invoices = transactions
    ? transactions
        .filter((transaction) => transaction.type === "invoice" && transaction.status !== "quotation")
        .filter((invoice) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            invoice.reference?.toLowerCase().includes(query) ||
            invoice.description?.toLowerCase().includes(query)
          );
        })
        .filter((invoice) => {
          if (statusFilter === "all") return true;
          if (statusFilter === "paid") return invoice.status === "paid" || invoice.status === "completed";
          if (statusFilter === "open") return invoice.status === "open";
          if (statusFilter === "overdue") return isOverdue(invoice);
          if (statusFilter === "partial") return invoice.status === "partial";
          return true;
        })
    : [];

  // Filter quotations
  const quotations = transactions
    ? transactions
        .filter((transaction) => transaction.type === "invoice" && transaction.status === "quotation")
        .filter((quotation) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            quotation.reference?.toLowerCase().includes(query) ||
            quotation.description?.toLowerCase().includes(query)
          );
        })
    : [];

  // Filter sales receipts
  const salesReceipts = transactions
    ? transactions
        .filter((transaction) => transaction.type === "sales_receipt")
        .filter((receipt) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            receipt.reference?.toLowerCase().includes(query) ||
            receipt.description?.toLowerCase().includes(query)
          );
        })
    : [];

  // Get all invoices (unfiltered by status, but filtered by period for stats)
  // Memoized to prevent unnecessary recalculations on every render
  const allInvoicesUnfiltered = useMemo(() =>
    transactions
      ? transactions.filter((transaction) => transaction.type === "invoice" && transaction.status !== "quotation")
      : [],
    [transactions]
  );

  // Apply period filter to invoices for stats calculation (memoized for performance)
  const allInvoices = useMemo(() => {
    return filterByPeriod(allInvoicesUnfiltered);
  }, [allInvoicesUnfiltered, filterByPeriod]);

  // Get total amounts (memoized)
  // Note: Overdue is calculated from ALL invoices (not period-filtered) because an invoice
  // created months ago can become overdue today - we always want to show the true overdue amount
  const { totalInvoiced, totalPaid, totalPending, overdueAmount, paidCount, openCount, overdueCount } = useMemo(() => {
    const totalInvoiced = allInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    // Calculate paid amounts based on original amounts minus remaining balance
    const totalPaid = allInvoices.reduce((sum, invoice) => {
      // If invoice is completed, add full amount
      if (invoice.status === "completed" || invoice.status === "paid") {
        return sum + invoice.amount;
      }
      // For partially paid invoices, add the paid portion (original amount - balance)
      else if ((invoice.status === "open" || invoice.status === "partial") &&
               invoice.balance !== null && invoice.balance !== undefined) {
        return sum + (invoice.amount - invoice.balance);
      }
      return sum;
    }, 0);

    // Calculate open amounts based on remaining balances
    const totalPending = allInvoices.reduce((sum, invoice) => {
      if ((invoice.status === "open" || invoice.status === "overdue" || invoice.status === "partial") &&
          invoice.balance !== null && invoice.balance !== undefined) {
        return sum + invoice.balance;
      } else if ((invoice.status === "open" || invoice.status === "overdue" || invoice.status === "partial") &&
                 (invoice.balance === null || invoice.balance === undefined)) {
        return sum + invoice.amount;
      }
      return sum;
    }, 0);

    // Calculate overdue amount using real-time due date check (from ALL invoices, not period-filtered)
    // This ensures we always show the true overdue amount regardless of period selection
    const overdueInvoices = allInvoicesUnfiltered.filter(isOverdue);
    const overdueAmount = overdueInvoices.reduce((sum, inv) => {
      return sum + (inv.balance !== null && inv.balance !== undefined ? inv.balance : inv.amount);
    }, 0);

    // Count stats
    const paidCount = allInvoices.filter(inv => inv.status === "paid" || inv.status === "completed").length;
    const openCount = allInvoices.filter(inv => inv.status === "open" || inv.status === "partial").length;
    const overdueCount = overdueInvoices.length;

    return { totalInvoiced, totalPaid, totalPending, overdueAmount, paidCount, openCount, overdueCount };
  }, [allInvoices, allInvoicesUnfiltered, isOverdue]);

  // Quotation metrics
  const totalQuotations = quotations.reduce((sum, quotation) => sum + quotation.amount, 0);
  const quotationCount = quotations.length;

  // Recurring template selection helpers
  const handleSelectAllRecurring = (checked: boolean) => {
    if (checked) {
      setSelectedRecurringIds(new Set(recurringTemplates.map(t => t.id)));
    } else {
      setSelectedRecurringIds(new Set());
    }
  };

  const handleSelectOneRecurring = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedRecurringIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedRecurringIds(newSelected);
  };

  const isAllRecurringSelected = recurringTemplates.length > 0 && selectedRecurringIds.size === recurringTemplates.length;
  const isSomeRecurringSelected = selectedRecurringIds.size > 0 && selectedRecurringIds.size < recurringTemplates.length;

  const handleBulkDeleteRecurring = async () => {
    setIsBulkDeleteLoading(true);
    try {
      const deletePromises = Array.from(selectedRecurringIds).map(id =>
        apiRequest(`/api/recurring/${id}`, "DELETE")
      );
      await Promise.all(deletePromises);
      setSelectedRecurringIds(new Set());
      setShowBulkDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Templates deleted successfully" });
    } catch (error) {
      console.error('Failed to delete templates:', error);
      toast({ title: "Failed to delete templates", variant: "destructive" });
    } finally {
      setIsBulkDeleteLoading(false);
    }
  };

  const clearRecurringSelection = () => {
    setSelectedRecurringIds(new Set());
  };

  // Tab styling helper
  const getTabClass = (tab: string) => {
    const isActive = activeTab === tab;
    return `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
      isActive
        ? "bg-white text-slate-900 shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
                <p className="text-xs text-slate-500">Manage invoices, quotations & recurring billing</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block">
                {format(new Date(), 'MMMM d, yyyy')}
              </span>

              <PeriodSelector
                period={period}
                onPeriodChange={setPeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                periodLabel={periodLabel}
                isFiltered={isFiltered}
                onClear={clearFilter}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <CustomerDialog
                        buttonLabel="Add Customer"
                        buttonVariant="outline"
                        onSuccess={() => refetch()}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new customer</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create
                    <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/invoices/new" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-blue-500" />
                      <span>Invoice</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/quotations/new" className="flex items-center">
                      <FileSignature className="mr-2 h-4 w-4 text-purple-500" />
                      <span>Quotation</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recurring-invoices/new" className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-orange-500" />
                      <span>Recurring Template</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/payment-receive" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4 text-green-500" />
                      <span>Receive Payment</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSalesReceiptDialogOpen(true)}>
                    <Receipt className="mr-2 h-4 w-4 text-teal-500" />
                    <span>Sales Receipt</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/deposits" className="flex items-center">
                      <PiggyBank className="mr-2 h-4 w-4 text-amber-500" />
                      <span>Deposit</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/customer-credits/new" className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-indigo-500" />
                      <span>Customer Credit</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Stats Banner */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Total Invoiced */}
              <div className="relative p-6 overflow-hidden">
                <TrendingUp className="absolute -right-4 -bottom-4 h-28 w-28 text-slate-200 opacity-50" />
                <div className="relative">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Total Invoiced
                  </p>
                  <p className="text-3xl font-black text-slate-800 mb-2">
                    {formatCurrency(totalInvoiced, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""} total
                  </p>
                </div>
              </div>

              {/* Paid */}
              <div className="relative p-6 overflow-hidden bg-green-50/50">
                <CheckCircle2 className="absolute -right-4 -bottom-4 h-28 w-28 text-green-200 opacity-50" />
                <div className="relative">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
                    Paid
                  </p>
                  <p className="text-3xl font-black text-green-700 mb-2">
                    {formatCurrency(totalPaid, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-green-600">
                    {paidCount} invoice{paidCount !== 1 ? "s" : ""} completed
                  </p>
                </div>
              </div>

              {/* Outstanding */}
              <div className="relative p-6 overflow-hidden bg-amber-50/50">
                <Wallet className="absolute -right-4 -bottom-4 h-28 w-28 text-amber-200 opacity-50" />
                <div className="relative">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                    Outstanding
                  </p>
                  <p className="text-3xl font-black text-amber-700 mb-2">
                    {formatCurrency(totalPending, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-amber-600">
                    {openCount} invoice{openCount !== 1 ? "s" : ""} open
                  </p>
                </div>
              </div>

              {/* Overdue */}
              <div className={`relative p-6 overflow-hidden ${overdueAmount > 0 ? "bg-red-50/50" : ""}`}>
                <AlertCircle className={`absolute -right-4 -bottom-4 h-28 w-28 opacity-50 ${overdueAmount > 0 ? "text-red-200" : "text-slate-200"}`} />
                <div className="relative">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${overdueAmount > 0 ? "text-red-600" : "text-slate-400"}`}>
                    Overdue
                  </p>
                  <p className={`text-3xl font-black mb-2 ${overdueAmount > 0 ? "text-red-700" : "text-slate-400"}`}>
                    {formatCurrency(overdueAmount, homeCurrency, homeCurrency)}
                  </p>
                  <p className={`text-sm ${overdueAmount > 0 ? "text-red-600" : "text-slate-500"}`}>
                    {overdueCount > 0
                      ? `${overdueCount} invoice${overdueCount !== 1 ? "s" : ""} past due`
                      : "All payments on track"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Active Period Filter Indicator */}
          <ActiveFilterIndicator
            periodLabel={periodLabel}
            isFiltered={isFiltered}
            onClear={clearFilter}
          />
        </Card>

        {/* Main Content Card */}
        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          {/* Tabs Navigation */}
          <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={getTabClass("invoices")}
                >
                  Invoices
                </button>
                <button
                  onClick={() => setActiveTab("quotations")}
                  className={getTabClass("quotations")}
                >
                  Quotations
                  {quotationCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {quotationCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("recurring")}
                  className={getTabClass("recurring")}
                >
                  Recurring
                </button>
                <button
                  onClick={() => setActiveTab("sales-receipts")}
                  className={getTabClass("sales-receipts")}
                >
                  Sales Receipts
                  {salesReceipts.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded-full">
                      {salesReceipts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("customers")}
                  className={getTabClass("customers")}
                >
                  Customers
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 w-64 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
                    placeholder={
                      activeTab === "recurring" ? "Search templates..." :
                      activeTab === "quotations" ? "Search quotations..." :
                      activeTab === "sales-receipts" ? "Search sales receipts..." :
                      activeTab === "customers" ? "Search customers..." :
                      "Search invoices..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter - only for invoices tab */}
                {activeTab === "invoices" && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-10 bg-slate-50 border-slate-200 rounded-lg">
                      <Filter className="h-4 w-4 mr-2 text-slate-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Export Button */}
              <Button variant="outline" size="sm" className="h-10">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white">
            {activeTab === "invoices" && (
              <TransactionTable
                transactions={invoices}
                loading={isLoading}
                onDeleteSuccess={() => refetch()}
              />
            )}

            {activeTab === "quotations" && (
              <TransactionTable
                transactions={quotations}
                loading={isLoading}
                onDeleteSuccess={() => refetch()}
              />
            )}

            {activeTab === "recurring" && (
              <div className="p-6 relative">
                {recurringLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading templates...</p>
                  </div>
                ) : recurringTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No recurring templates</h3>
                    <p className="text-slate-500 mb-4">Create templates to automate your invoicing</p>
                    <Link href="/recurring-invoices/new">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Create Template
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllRecurringSelected}
                              onCheckedChange={handleSelectAllRecurring}
                              aria-label="Select all"
                              className={isSomeRecurringSelected ? "data-[state=checked]:bg-slate-400" : ""}
                            />
                          </TableHead>
                          <TableHead className="w-24 font-semibold text-slate-600">Status</TableHead>
                          <TableHead className="w-24 font-semibold text-slate-600">Frequency</TableHead>
                          <TableHead className="w-28 font-semibold text-slate-600">Next Run</TableHead>
                          <TableHead className="font-semibold text-slate-600">Template Name</TableHead>
                          <TableHead className="font-semibold text-slate-600">Customer</TableHead>
                          <TableHead className="font-semibold text-slate-600 text-right">Amount</TableHead>
                          <TableHead className="w-16 font-semibold text-slate-600 text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringTemplates.map((template) => (
                          <TableRow
                            key={template.id}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                            onClick={() => navigate(`/recurring-invoices/${template.id}/edit`)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedRecurringIds.has(template.id)}
                                onCheckedChange={(checked) => handleSelectOneRecurring(template.id, checked as boolean)}
                                aria-label={`Select ${template.templateName}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={template.status === "active" ? "default" : "secondary"}
                                className={template.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
                              >
                                {template.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 capitalize">
                                {template.frequency}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {format(new Date(template.nextRunAt), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">
                              {template.templateName}
                            </TableCell>
                            <TableCell className="text-sm font-medium text-slate-900">
                              {(template as any).customerName}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold text-slate-900">
                              {formatCurrency(template.totalAmount, homeCurrency, homeCurrency)}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => deleteMutation.mutate(template.id)}
                                      disabled={deleteMutation.isPending}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete template</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Floating Bulk Actions Bar for Recurring */}
                {selectedRecurringIds.size > 0 && (
                  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
                      <span className="text-sm font-medium">
                        {selectedRecurringIds.size} template{selectedRecurringIds.size !== 1 ? 's' : ''} selected
                      </span>
                      <div className="h-5 w-px bg-slate-700" />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-slate-800 h-8 px-3"
                          onClick={() => setShowBulkDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-slate-800 h-8 px-3"
                          onClick={() => {
                            // Pause all selected templates
                            selectedRecurringIds.forEach(id => {
                              const template = recurringTemplates.find(t => t.id === id);
                              if (template?.status === 'active') {
                                pauseMutation.mutate(id);
                              }
                            });
                          }}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-slate-800 h-8 px-3"
                          onClick={() => {
                            // Resume all selected templates
                            selectedRecurringIds.forEach(id => {
                              const template = recurringTemplates.find(t => t.id === id);
                              if (template?.status === 'paused') {
                                resumeMutation.mutate(id);
                              }
                            });
                          }}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      </div>
                      <div className="h-5 w-px bg-slate-700" />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                        onClick={clearRecurringSelection}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Clear selection</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Bulk Delete Confirmation Dialog */}
                <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete {selectedRecurringIds.size} template{selectedRecurringIds.size !== 1 ? 's' : ''}?</DialogTitle>
                      <DialogDescription>
                        This will permanently delete the selected recurring templates.
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                      <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleBulkDeleteRecurring}
                        disabled={isBulkDeleteLoading}
                      >
                        {isBulkDeleteLoading ? 'Deleting...' : 'Delete All'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeTab === "sales-receipts" && (
              <TransactionTable
                transactions={salesReceipts}
                loading={isLoading}
                onDeleteSuccess={() => refetch()}
              />
            )}

            {activeTab === "customers" && (
              <div className="p-0">
                <CustomerList />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Sales Receipt Dialog */}
      <Dialog open={salesReceiptDialogOpen} onOpenChange={setSalesReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Receipt</DialogTitle>
            <DialogDescription>
              Record immediate cash sales without creating an invoice
            </DialogDescription>
          </DialogHeader>
          <SalesReceiptForm
            onSuccess={() => {
              setSalesReceiptDialogOpen(false);
              refetch();
            }}
            onCancel={() => setSalesReceiptDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
