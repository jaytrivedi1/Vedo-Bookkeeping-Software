import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, useSearch } from "wouter";
import { format, startOfYear, endOfYear, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ChevronLeft, Calendar, Filter } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatReportAmount } from "@/lib/currencyUtils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountLedgerResponse {
  account: {
    id: number;
    name: string;
    code: string;
    type: string;
  };
  beginningBalance: number;
  endingBalance: number;
  entries: {
    id: number;
    date: string;
    transactionId: number;
    transactionType: string;
    transactionReference: string;
    contactName: string;
    memo: string;
    splitAccountName: string;
    debit: number;
    credit: number;
    amount: number;
    runningBalance: number;
    currency: string | null;
    exchangeRate: number | null;
    foreignAmount: number | null;
  }[];
}

interface CompanySettings {
  fiscalYearStartMonth: number;
}

interface Preferences {
  homeCurrency?: string;
}

export default function AccountTransactions() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();
  const accountId = params.id ? parseInt(params.id) : 0;
  
  // Parse query params from useSearch
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const backUrl = queryParams.get('back') || '/reports';
  const backLabel = queryParams.get('backLabel') || 'Reports';
  
  // Get fiscal year from company settings
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: ['/api/companies/settings'],
  });

  const fiscalYearStartMonth = companySettings?.fiscalYearStartMonth || 1;
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Calculate fiscal year bounds
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  let fiscalYearStart: Date;
  let fiscalYearEnd: Date;
  
  if (currentMonth >= fiscalYearStartMonth) {
    fiscalYearStart = new Date(currentYear, fiscalYearStartMonth - 1, 1);
    fiscalYearEnd = new Date(currentYear + 1, fiscalYearStartMonth - 1, 0);
  } else {
    fiscalYearStart = new Date(currentYear - 1, fiscalYearStartMonth - 1, 1);
    fiscalYearEnd = new Date(currentYear, fiscalYearStartMonth - 1, 0);
  }

  const [dateRange, setDateRange] = useState({
    startDate: fiscalYearStart,
    endDate: fiscalYearEnd,
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current-fiscal-year");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all");
  const [memoSearch, setMemoSearch] = useState<string>("");

  // Fetch account ledger data
  const { data: ledgerData, isLoading, error } = useQuery<AccountLedgerResponse>({
    queryKey: [`/api/accounts/${accountId}/ledger`, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');
      const response = await apiRequest(`/api/accounts/${accountId}/ledger?startDate=${startDate}&endDate=${endDate}`);
      return response;
    },
    enabled: accountId > 0,
  });

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const today = new Date();
    
    switch(period) {
      case "current-month":
        setDateRange({
          startDate: startOfMonth(today),
          endDate: endOfMonth(today)
        });
        break;
      case "last-month":
        setDateRange({
          startDate: startOfMonth(subMonths(today, 1)),
          endDate: endOfMonth(subMonths(today, 1))
        });
        break;
      case "current-fiscal-year":
        setDateRange({ startDate: fiscalYearStart, endDate: fiscalYearEnd });
        break;
      default:
        // Assume it's a specific fiscal year
        const yearNum = parseInt(period);
        if (!isNaN(yearNum)) {
          setDateRange({
            startDate: new Date(yearNum, fiscalYearStartMonth - 1, 1),
            endDate: new Date(yearNum + 1, fiscalYearStartMonth - 1, 0)
          });
        }
    }
  };
  
  // Filter entries based on filters
  const filteredEntries = useMemo(() => {
    if (!ledgerData?.entries) return [];
    
    return ledgerData.entries.filter(entry => {
      // Filter by transaction type
      if (transactionTypeFilter !== 'all' && entry.transactionType !== transactionTypeFilter) {
        return false;
      }
      
      // Filter by memo search
      if (memoSearch && !entry.memo.toLowerCase().includes(memoSearch.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [ledgerData, transactionTypeFilter, memoSearch]);

  // Get account type label
  const getAccountTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      assets: 'Asset',
      bank: 'Bank',
      current_assets: 'Current Asset',
      fixed_assets: 'Fixed Asset',
      other_assets: 'Other Asset',
      accounts_receivable: 'Accounts Receivable',
      liabilities: 'Liability',
      current_liabilities: 'Current Liability',
      long_term_liabilities: 'Long-Term Liability',
      accounts_payable: 'Accounts Payable',
      credit_card: 'Credit Card',
      equity: 'Equity',
      income: 'Income',
      other_income: 'Other Income',
      expenses: 'Expense',
      cost_of_goods_sold: 'Cost of Goods Sold',
      other_expense: 'Other Expense',
    };
    return typeLabels[type] || type;
  };

  // Get transaction detail route
  const getTransactionRoute = (transactionType: string, transactionId: number): string | null => {
    const routeMap: Record<string, string> = {
      'invoice': `/invoices/${transactionId}`,
      'payment': `/payments/${transactionId}`,
      'bill': `/bills/${transactionId}`,
      'expense': `/expenses/${transactionId}`,
      'cheque': `/cheques/${transactionId}`,
      'journal_entry': `/journals/${transactionId}`,
      'deposit': `/deposits/${transactionId}`,
    };
    return routeMap[transactionType] || null;
  };

  // Handle transaction row click
  const handleTransactionClick = (transactionType: string, transactionId: number) => {
    const route = getTransactionRoute(transactionType, transactionId);
    if (route) {
      // Build the back URL - current page with all its query parameters
      const currentUrl = `/accounts/${accountId}/transactions${searchString}`;
      const accountName = ledgerData?.account.name || 'Account';
      
      // Navigate with back context
      setLocation(`${route}?back=${encodeURIComponent(currentUrl)}&backLabel=${encodeURIComponent(accountName)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ledgerData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Account not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(backUrl)}
          className="mb-4"
          data-testid="button-back"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to {backLabel}
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-account-name">
              {ledgerData.account.name}
            </h1>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span data-testid="text-account-code">Code: {ledgerData.account.code}</span>
              <span data-testid="text-account-type">Type: {getAccountTypeLabel(ledgerData.account.type)}</span>
            </div>
          </div>
          
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 p-4 bg-gray-50 rounded-lg border">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Period</label>
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger data-testid="select-period">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="current-fiscal-year">Current Fiscal Year</SelectItem>
                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    FY {year}-{year + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Transaction Type</label>
            <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
              <SelectTrigger data-testid="select-transaction-type">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="bill">Bill</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="journal_entry">Journal Entry</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="sales_receipt">Sales Receipt</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search Memo</label>
            <Input
              type="text"
              placeholder="Search in memos..."
              value={memoSearch}
              onChange={(e) => setMemoSearch(e.target.value)}
              data-testid="input-memo-search"
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
            {filteredEntries.length !== ledgerData.entries.length && (
              <span className="ml-2 text-sm">
                (Showing {filteredEntries.length} of {ledgerData.entries.length} transactions)
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this period
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-date">Date</TableHead>
                    <TableHead data-testid="header-type">Type</TableHead>
                    <TableHead data-testid="header-reference">Ref #</TableHead>
                    <TableHead data-testid="header-contact">Contact</TableHead>
                    <TableHead data-testid="header-memo">Memo</TableHead>
                    <TableHead data-testid="header-split">Split</TableHead>
                    <TableHead className="text-right" data-testid="header-debit">Debit</TableHead>
                    <TableHead className="text-right" data-testid="header-credit">Credit</TableHead>
                    <TableHead className="text-right" data-testid="header-balance">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/50 font-medium">
                    <TableCell colSpan={6}>Beginning Balance</TableCell>
                    <TableCell className="text-right" colSpan={2}></TableCell>
                    <TableCell className="text-right" data-testid="text-beginning-balance">
                      {formatReportAmount(ledgerData.beginningBalance)}
                    </TableCell>
                  </TableRow>
                  {filteredEntries.map((entry) => {
                    const hasDetailView = getTransactionRoute(entry.transactionType, entry.transactionId) !== null;
                    return (
                      <TableRow 
                        key={entry.id} 
                        data-testid={`row-transaction-${entry.id}`}
                        onClick={() => handleTransactionClick(entry.transactionType, entry.transactionId)}
                        className={hasDetailView ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}
                      >
                        <TableCell data-testid={`text-date-${entry.id}`}>
                          {format(parseISO(entry.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell data-testid={`text-type-${entry.id}`}>
                          {entry.transactionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </TableCell>
                        <TableCell data-testid={`text-reference-${entry.id}`}>
                          <span className="font-medium">
                            {entry.transactionReference || '-'}
                          </span>
                        </TableCell>
                        <TableCell data-testid={`text-contact-${entry.id}`}>
                          {entry.contactName || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-memo-${entry.id}`}>
                          {entry.memo || '-'}
                        </TableCell>
                        <TableCell data-testid={`text-split-${entry.id}`}>
                          {entry.splitAccountName}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-debit-${entry.id}`}>
                          {entry.debit > 0 ? formatReportAmount(entry.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-credit-${entry.id}`}>
                          {entry.credit > 0 ? formatReportAmount(entry.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-balance-${entry.id}`}>
                          {formatReportAmount(entry.runningBalance)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={6}>Ending Balance</TableCell>
                    <TableCell className="text-right" colSpan={2}></TableCell>
                    <TableCell className="text-right" data-testid="text-ending-balance">
                      {formatReportAmount(ledgerData.endingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
