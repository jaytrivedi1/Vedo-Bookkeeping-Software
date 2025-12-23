import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import {
  PlusIcon,
  Trash2,
  Receipt,
  Wallet,
  CheckCircle2,
  Clock,
  TrendingDown,
  Download,
  Search,
  Filter,
  CalendarIcon,
  ChevronDown,
  Printer,
  Mail,
  X
} from "lucide-react";
import VendorDialog from "@/components/vendors/VendorDialog";
import VendorList from "@/components/vendors/VendorList";
import { PeriodSelector, ActiveFilterIndicator } from "@/components/PeriodSelector";
import { usePeriodFilter } from "@/hooks/usePeriodFilter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Transaction, Contact, CompanySettings } from "@shared/schema";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Preferences {
  homeCurrency?: string;
}

interface CompanySettingsResponse extends CompanySettings {
  fiscalYearStartMonth?: number;
}

export default function Expenses() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("expenses");
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<number>>(new Set());
  const [selectedBillIds, setSelectedBillIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  const { data: transactions, isLoading, refetch, error } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
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
    isFiltered: isPeriodFiltered,
    filterByPeriod,
    clearFilter,
  } = usePeriodFilter({
    fiscalYearStartMonth: companySettings?.fiscalYearStartMonth || 1,
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  const getContactName = (contactId: number | null): string => {
    if (!contactId) return 'No vendor';
    if (!contacts) return `ID: ${contactId}`;

    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : `ID: ${contactId}`;
  };

  const getPaymentMethodLabel = (method: string | null): string => {
    if (!method) return 'N/A';
    const labels: Record<string, string> = {
      'cash': 'Cash',
      'check': 'Check',
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'other': 'Other'
    };
    return labels[method] || method;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 hover:bg-green-100';
      case 'open':
        return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 hover:bg-slate-100';
      default:
        return 'bg-slate-100 text-slate-600 hover:bg-slate-100';
    }
  };

  // Get all expenses (unfiltered by search/date filters)
  // Memoized to prevent unnecessary recalculations on every render
  const allExpensesUnfiltered = useMemo(() =>
    transactions
      ? transactions.filter((transaction) => transaction.type === "expense")
      : [],
    [transactions]
  );

  // Apply period filter to expenses for stats
  const allExpenses = useMemo(
    () => filterByPeriod(allExpensesUnfiltered),
    [allExpensesUnfiltered, filterByPeriod]
  );

  const expenses = transactions
    ? transactions
        .filter((transaction) => transaction.type === "expense")
        .filter((expense) => {
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contactName = getContactName(expense.contactId).toLowerCase();
            if (
              !expense.reference.toLowerCase().includes(query) &&
              !expense.description?.toLowerCase().includes(query) &&
              !contactName.includes(query)
            ) {
              return false;
            }
          }

          if (statusFilter !== "all" && expense.status !== statusFilter) {
            return false;
          }

          if (dateFrom && new Date(expense.date) < dateFrom) {
            return false;
          }

          if (dateTo && new Date(expense.date) > dateTo) {
            return false;
          }

          return true;
        })
    : [];

  const bills = transactions
    ? transactions
        .filter((transaction) => transaction.type === "bill")
        .filter((bill) => {
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contactName = getContactName(bill.contactId).toLowerCase();
            if (
              !bill.reference.toLowerCase().includes(query) &&
              !bill.description?.toLowerCase().includes(query) &&
              !contactName.includes(query)
            ) {
              return false;
            }
          }

          if (statusFilter !== "all" && bill.status !== statusFilter) {
            return false;
          }

          if (dateFrom && new Date(bill.date) < dateFrom) {
            return false;
          }

          if (dateTo && new Date(bill.date) > dateTo) {
            return false;
          }

          return true;
        })
    : [];

  // Memoized stats calculations for period-filtered data
  const { totalExpenses, completedExpenses, openExpenses, completedCount, openCount } = useMemo(() => {
    const total = allExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const completed = allExpenses
      .filter((expense) => expense.status === "completed")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const open = allExpenses
      .filter((expense) => expense.status === "open")
      .reduce((sum, expense) => sum + expense.amount, 0);
    const completedCnt = allExpenses.filter(e => e.status === "completed").length;
    const openCnt = allExpenses.filter(e => e.status === "open").length;

    return {
      totalExpenses: total,
      completedExpenses: completed,
      openExpenses: open,
      completedCount: completedCnt,
      openCount: openCnt,
    };
  }, [allExpenses]);

  const billCount = transactions?.filter(t => t.type === "bill").length || 0;

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    setIsDeleteLoading(true);
    try {
      await apiRequest(`/api/transactions/${transactionToDelete.id}`, 'DELETE');
      setTransactionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      refetch();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // Expense selection helpers
  const handleSelectAllExpenses = (checked: boolean) => {
    if (checked) {
      setSelectedExpenseIds(new Set(expenses.map(e => e.id)));
    } else {
      setSelectedExpenseIds(new Set());
    }
  };

  const handleSelectOneExpense = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedExpenseIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedExpenseIds(newSelected);
  };

  const isAllExpensesSelected = expenses.length > 0 && selectedExpenseIds.size === expenses.length;
  const isSomeExpensesSelected = selectedExpenseIds.size > 0 && selectedExpenseIds.size < expenses.length;

  // Bill selection helpers
  const handleSelectAllBills = (checked: boolean) => {
    if (checked) {
      setSelectedBillIds(new Set(bills.map(b => b.id)));
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const handleSelectOneBill = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedBillIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedBillIds(newSelected);
  };

  const isAllBillsSelected = bills.length > 0 && selectedBillIds.size === bills.length;
  const isSomeBillsSelected = selectedBillIds.size > 0 && selectedBillIds.size < bills.length;

  // Bulk delete handler
  const handleBulkDelete = async () => {
    setIsBulkDeleteLoading(true);
    const idsToDelete = activeTab === "expenses" ? selectedExpenseIds : selectedBillIds;

    try {
      const deletePromises = Array.from(idsToDelete).map(id =>
        apiRequest(`/api/transactions/${id}`, 'DELETE')
      );
      await Promise.all(deletePromises);

      if (activeTab === "expenses") {
        setSelectedExpenseIds(new Set());
      } else {
        setSelectedBillIds(new Set());
      }
      setShowBulkDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      refetch();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsBulkDeleteLoading(false);
    }
  };

  const clearSelection = () => {
    if (activeTab === "expenses") {
      setSelectedExpenseIds(new Set());
    } else {
      setSelectedBillIds(new Set());
    }
  };

  const currentSelectionCount = activeTab === "expenses" ? selectedExpenseIds.size : selectedBillIds.size;

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900" data-testid="heading-expenses">Expenses</h1>
                <p className="text-xs text-slate-500">Track expenses, bills & vendor payments</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block" data-testid="text-current-date">
                {format(new Date(), 'MMMM d, yyyy')}
              </span>

              <PeriodSelector
                period={period}
                onPeriodChange={setPeriod}
                customRange={customRange}
                onCustomRangeChange={setCustomRange}
                periodLabel={periodLabel}
                isFiltered={isPeriodFiltered}
                onClear={clearFilter}
              />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <VendorDialog
                        buttonLabel="Add Vendor"
                        buttonVariant="outline"
                        onSuccess={() => refetch()}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add a new vendor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm" data-testid="button-new-expense">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create
                    <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/expenses/new" className="flex items-center">
                      <Receipt className="mr-2 h-4 w-4 text-orange-500" />
                      <span>Expense</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bills/new" className="flex items-center">
                      <Wallet className="mr-2 h-4 w-4 text-purple-500" />
                      <span>Bill</span>
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
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
              {/* Total Expenses */}
              <div className="relative p-6 overflow-hidden">
                <TrendingDown className="absolute -right-4 -bottom-4 h-28 w-28 text-slate-200 opacity-50" />
                <div className="relative">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Total Expenses
                  </p>
                  <p className="text-3xl font-black text-slate-800 mb-2" data-testid="text-total-expenses">
                    {formatCurrency(totalExpenses, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-slate-500">
                    {allExpenses.length} expense{allExpenses.length !== 1 ? "s" : ""} recorded
                  </p>
                </div>
              </div>

              {/* Completed */}
              <div className="relative p-6 overflow-hidden bg-green-50/50">
                <CheckCircle2 className="absolute -right-4 -bottom-4 h-28 w-28 text-green-200 opacity-50" />
                <div className="relative">
                  <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">
                    Completed
                  </p>
                  <p className="text-3xl font-black text-green-700 mb-2" data-testid="text-completed-expenses">
                    {formatCurrency(completedExpenses, homeCurrency, homeCurrency)}
                  </p>
                  <p className="text-sm text-green-600">
                    {completedCount} expense{completedCount !== 1 ? "s" : ""} paid
                  </p>
                </div>
              </div>

              {/* Open */}
              <div className={`relative p-6 overflow-hidden ${openExpenses > 0 ? "bg-amber-50/50" : ""}`}>
                <Clock className={`absolute -right-4 -bottom-4 h-28 w-28 opacity-50 ${openExpenses > 0 ? "text-amber-200" : "text-slate-200"}`} />
                <div className="relative">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${openExpenses > 0 ? "text-amber-600" : "text-slate-400"}`}>
                    Open
                  </p>
                  <p className={`text-3xl font-black mb-2 ${openExpenses > 0 ? "text-amber-700" : "text-slate-400"}`} data-testid="text-open-expenses">
                    {formatCurrency(openExpenses, homeCurrency, homeCurrency)}
                  </p>
                  <p className={`text-sm ${openExpenses > 0 ? "text-amber-600" : "text-slate-500"}`}>
                    {openCount > 0
                      ? `${openCount} expense${openCount !== 1 ? "s" : ""} pending`
                      : "All expenses completed"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          <ActiveFilterIndicator
            periodLabel={periodLabel}
            isFiltered={isPeriodFiltered}
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
                  onClick={() => setActiveTab("expenses")}
                  className={getTabClass("expenses")}
                  data-testid="tab-expenses"
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveTab("bills")}
                  className={getTabClass("bills")}
                  data-testid="tab-bills"
                >
                  Bills
                  {billCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                      {billCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("vendors")}
                  className={getTabClass("vendors")}
                  data-testid="tab-vendors"
                >
                  Vendors
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 w-64 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white"
                    placeholder={
                      activeTab === "vendors" ? "Search vendors..." :
                      activeTab === "bills" ? "Search bills..." :
                      "Search expenses..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-expenses"
                  />
                </div>

                {/* Status Filter */}
                {activeTab !== "vendors" && (
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] h-10 bg-slate-50 border-slate-200 rounded-lg" data-testid="select-status-filter">
                      <Filter className="h-4 w-4 mr-2 text-slate-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Date Range */}
                {activeTab !== "vendors" && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 justify-start text-left font-normal bg-slate-50 border-slate-200 rounded-lg",
                            !dateFrom && "text-muted-foreground"
                          )}
                          data-testid="button-date-from"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 justify-start text-left font-normal bg-slate-50 border-slate-200 rounded-lg",
                            !dateTo && "text-muted-foreground"
                          )}
                          data-testid="button-date-to"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {(dateFrom || dateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 text-slate-500 hover:text-slate-700"
                        onClick={() => {
                          setDateFrom(undefined);
                          setDateTo(undefined);
                        }}
                        data-testid="button-clear-dates"
                      >
                        Clear
                      </Button>
                    )}
                  </>
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
            {activeTab === "expenses" && (
              <div className="overflow-x-auto relative">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500" data-testid="text-loading">Loading expenses...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500" data-testid="text-error">Error loading expenses. Please try again.</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No expenses found</h3>
                    <p className="text-slate-500 mb-4">Start tracking your business expenses</p>
                    <Link href="/expenses/new">
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllExpensesSelected}
                            onCheckedChange={handleSelectAllExpenses}
                            aria-label="Select all"
                            className={isSomeExpensesSelected ? "data-[state=checked]:bg-slate-400" : ""}
                          />
                        </TableHead>
                        <TableHead className="w-24 font-semibold text-slate-600" data-testid="header-status">Status</TableHead>
                        <TableHead className="w-28 font-semibold text-slate-600" data-testid="header-date">Date</TableHead>
                        <TableHead className="font-semibold text-slate-600" data-testid="header-reference">Number</TableHead>
                        <TableHead className="font-semibold text-slate-600" data-testid="header-payee">Vendor</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right" data-testid="header-amount">Amount</TableHead>
                        <TableHead className="w-16 font-semibold text-slate-600 text-right" data-testid="header-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow
                          key={expense.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/expenses/${expense.id}`)}
                          data-testid={`row-expense-${expense.id}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedExpenseIds.has(expense.id)}
                              onCheckedChange={(checked) => handleSelectOneExpense(expense.id, checked as boolean)}
                              aria-label={`Select expense ${expense.reference}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`badge-status-${expense.id}`}>
                            <Badge className={getStatusBadgeStyle(expense.status)}>
                              {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-date-${expense.id}`}>
                            {format(new Date(expense.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-900" data-testid={`text-reference-${expense.id}`}>
                            {expense.reference || '—'}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-900" data-testid={`text-payee-${expense.id}`}>
                            {(() => {
                              const contact = contacts?.find(c => c.id === expense.contactId);
                              const contactName = getContactName(expense.contactId);
                              return formatContactName(contactName, contact?.currency, homeCurrency);
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900" data-testid={`text-amount-${expense.id}`}>
                            {formatCurrency(expense.amount, expense.currency, homeCurrency)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setTransactionToDelete(expense)}
                                  data-testid={`button-delete-${expense.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this expense and all associated records.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    disabled={isDeleteLoading}
                                  >
                                    {isDeleteLoading ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {activeTab === "bills" && (
              <div className="overflow-x-auto relative">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-500" data-testid="text-loading-bills">Loading bills...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <p className="text-red-500" data-testid="text-error-bills">Error loading bills. Please try again.</p>
                  </div>
                ) : bills.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Wallet className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No bills found</h3>
                    <p className="text-slate-500 mb-4">Track bills from your vendors</p>
                    <Link href="/bills/new">
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Bill
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={isAllBillsSelected}
                            onCheckedChange={handleSelectAllBills}
                            aria-label="Select all"
                            className={isSomeBillsSelected ? "data-[state=checked]:bg-slate-400" : ""}
                          />
                        </TableHead>
                        <TableHead className="w-24 font-semibold text-slate-600" data-testid="header-bill-status">Status</TableHead>
                        <TableHead className="w-28 font-semibold text-slate-600" data-testid="header-bill-date">Date</TableHead>
                        <TableHead className="font-semibold text-slate-600" data-testid="header-bill-reference">Number</TableHead>
                        <TableHead className="font-semibold text-slate-600" data-testid="header-bill-vendor">Vendor</TableHead>
                        <TableHead className="font-semibold text-slate-600 text-right" data-testid="header-bill-amount">Amount</TableHead>
                        <TableHead className="w-16 font-semibold text-slate-600 text-right" data-testid="header-bill-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => (
                        <TableRow
                          key={bill.id}
                          className="hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/bill-view/${bill.id}`)}
                          data-testid={`row-bill-${bill.id}`}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedBillIds.has(bill.id)}
                              onCheckedChange={(checked) => handleSelectOneBill(bill.id, checked as boolean)}
                              aria-label={`Select bill ${bill.reference}`}
                            />
                          </TableCell>
                          <TableCell data-testid={`badge-bill-status-${bill.id}`}>
                            <Badge className={getStatusBadgeStyle(bill.status)}>
                              {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600" data-testid={`text-bill-date-${bill.id}`}>
                            {format(new Date(bill.date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-900" data-testid={`text-bill-reference-${bill.id}`}>
                            {bill.reference || '—'}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-slate-900" data-testid={`text-bill-vendor-${bill.id}`}>
                            {(() => {
                              const contact = contacts?.find(c => c.id === bill.contactId);
                              const contactName = getContactName(bill.contactId);
                              return formatContactName(contactName, contact?.currency, homeCurrency);
                            })()}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-slate-900" data-testid={`text-bill-amount-${bill.id}`}>
                            {formatCurrency(bill.amount, bill.currency, homeCurrency)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setTransactionToDelete(bill)}
                                  data-testid={`button-delete-bill-${bill.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this bill and all associated records.
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleDelete}
                                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                    disabled={isDeleteLoading}
                                  >
                                    {isDeleteLoading ? 'Deleting...' : 'Delete'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}

            {activeTab === "vendors" && (
              <div className="p-0">
                <VendorList />
              </div>
            )}
          </div>
        </Card>

        {/* Floating Bulk Actions Bar */}
        {currentSelectionCount > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
              <span className="text-sm font-medium">
                {currentSelectionCount} {activeTab === "expenses" ? "expense" : "bill"}{currentSelectionCount !== 1 ? 's' : ''} selected
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
                    console.log('Batch print:', activeTab === "expenses" ? Array.from(selectedExpenseIds) : Array.from(selectedBillIds));
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
              <div className="h-5 w-px bg-slate-700" />
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                onClick={clearSelection}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Clear selection</span>
              </Button>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete {currentSelectionCount} {activeTab === "expenses" ? "expense" : "bill"}{currentSelectionCount !== 1 ? 's' : ''}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected {activeTab === "expenses" ? "expenses" : "bills"} and all associated records.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkDelete}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                disabled={isBulkDeleteLoading}
              >
                {isBulkDeleteLoading ? 'Deleting...' : 'Delete All'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
