import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, FileDown, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import jsPDF from "jspdf";
import "jspdf-autotable";
import ExportMenu from "@/components/ExportMenu";
import { 
  exportIncomeStatementToCSV, 
  exportIncomeStatementToPDF,
  exportBalanceSheetToCSV,
  exportBalanceSheetToPDF,
  exportAccountBalancesToCSV,
  exportAccountBalancesToPDF,
  generateFilename 
} from "@/lib/exportUtils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Account, LedgerEntry } from "@shared/schema";
import { getFiscalYearBounds, getFiscalYearLabel, getFiscalYear } from "@shared/fiscalYear";
import { queryClient } from "@/lib/queryClient";

export default function Reports() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | 'current'>(new Date().getFullYear());
  const [, setLocation] = useLocation();
  
  // Store stable current date ISO string that won't change on re-renders
  const currentDateISORef = useRef(new Date().toISOString());
  
  // Fetch company settings to get fiscal year start month
  const { data: company } = useQuery({
    queryKey: ['/api/companies/default'],
  });
  
  const fiscalYearStartMonth = useMemo(() => company?.fiscalYearStartMonth || 1, [company?.fiscalYearStartMonth]);
  
  // Calculate fiscal year bounds for the selected fiscal year
  const fiscalYearBounds = useMemo(() => {
    const today = new Date();
    const todayISO = currentDateISORef.current;
    
    if (selectedFiscalYear === 'current') {
      const bounds = getFiscalYearBounds(today, fiscalYearStartMonth);
      return {
        fiscalYearStart: bounds.fiscalYearStart,
        fiscalYearEnd: bounds.fiscalYearEnd,
        fiscalYearStartISO: bounds.fiscalYearStart.toISOString(),
        fiscalYearEndISO: bounds.fiscalYearEnd.toISOString(),
        currentDateISO: todayISO,
        asOfDate: today,
        asOfDateISO: todayISO,
      };
    }
    
    // For a specific fiscal year, create a date within that fiscal year
    const yearDate = new Date(selectedFiscalYear, fiscalYearStartMonth - 1, 15);
    const bounds = getFiscalYearBounds(yearDate, fiscalYearStartMonth);
    return {
      fiscalYearStart: bounds.fiscalYearStart,
      fiscalYearEnd: bounds.fiscalYearEnd,
      fiscalYearStartISO: bounds.fiscalYearStart.toISOString(),
      fiscalYearEndISO: bounds.fiscalYearEnd.toISOString(),
      currentDateISO: todayISO,
      asOfDate: bounds.fiscalYearEnd,
      asOfDateISO: bounds.fiscalYearEnd.toISOString(),
    };
  }, [selectedFiscalYear, fiscalYearStartMonth]);
  
  // Generate fiscal year options (current + past 3 years)
  const fiscalYearOptions = useMemo(() => {
    const today = new Date();
    const currentFY = getFiscalYear(today, fiscalYearStartMonth);
    const options = [];
    
    // Add current fiscal year option
    options.push({
      value: 'current' as const,
      label: `Current Fiscal Year (${getFiscalYearLabel(today, fiscalYearStartMonth)})`,
    });
    
    // Add past 3 fiscal years
    for (let i = 1; i <= 3; i++) {
      const yearNum = currentFY - i;
      const yearDate = new Date(yearNum, fiscalYearStartMonth - 1, 15);
      options.push({
        value: yearNum,
        label: getFiscalYearLabel(yearDate, fiscalYearStartMonth),
      });
    }
    
    return options;
  }, [fiscalYearStartMonth]);
  
  // Initialize selected fiscal year to current on mount
  useEffect(() => {
    setSelectedFiscalYear('current');
  }, []);
  
  // Handler for fiscal year change
  const handleFiscalYearChange = (value: string) => {
    const newValue = value === 'current' ? 'current' : parseInt(value);
    setSelectedFiscalYear(newValue);
    
    // Invalidate and refetch reports
    queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reports/balance-sheet'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reports/trial-balance'] });
    queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
  };
  
  // Fetch income statement data with fiscal year dates
  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ['/api/reports/income-statement', fiscalYearBounds.fiscalYearStartISO, fiscalYearBounds.fiscalYearEndISO],
    queryFn: async () => {
      const response = await fetch(`/api/reports/income-statement?startDate=${fiscalYearBounds.fiscalYearStartISO}&endDate=${fiscalYearBounds.fiscalYearEndISO}`);
      if (!response.ok) throw new Error('Failed to fetch income statement');
      return response.json();
    },
    enabled: activeTab === 'income-statement' || activeTab === '',
  });
  
  // Fetch balance sheet data with asOfDate
  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/reports/balance-sheet', fiscalYearBounds.asOfDateISO],
    queryFn: async () => {
      const response = await fetch(`/api/reports/balance-sheet?asOfDate=${fiscalYearBounds.asOfDateISO}`);
      if (!response.ok) throw new Error('Failed to fetch balance sheet');
      return response.json();
    },
    enabled: activeTab === 'balance-sheet' || activeTab === '',
  });
  
  // Fetch account balances (for detailed breakdowns) with fiscal year dates
  const { data: accountBalances, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/reports/account-balances', fiscalYearBounds.fiscalYearStartISO, fiscalYearBounds.fiscalYearEndISO],
    queryFn: async () => {
      const response = await fetch(`/api/reports/account-balances?startDate=${fiscalYearBounds.fiscalYearStartISO}&endDate=${fiscalYearBounds.fiscalYearEndISO}`);
      if (!response.ok) throw new Error('Failed to fetch account balances');
      return response.json();
    },
    enabled: activeTab !== 'general-ledger' && activeTab !== 'trial-balance',
  });
  
  // Fetch trial balance with fiscal year dates
  const { data: trialBalanceData, isLoading: trialBalanceLoading } = useQuery({
    queryKey: ['/api/reports/trial-balance', fiscalYearBounds.fiscalYearStartISO, fiscalYearBounds.fiscalYearEndISO, fiscalYearBounds.asOfDateISO],
    queryFn: async () => {
      const response = await fetch(`/api/reports/trial-balance?startDate=${fiscalYearBounds.fiscalYearStartISO}&endDate=${fiscalYearBounds.fiscalYearEndISO}&asOfDate=${fiscalYearBounds.asOfDateISO}`);
      if (!response.ok) throw new Error('Failed to fetch trial balance');
      return response.json();
    },
    enabled: activeTab === 'trial-balance',
  });
  
  // Fetch ledger entries (for general ledger) with fiscal year dates
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/ledger-entries', fiscalYearBounds.fiscalYearStartISO, fiscalYearBounds.fiscalYearEndISO],
    queryFn: async () => {
      const response = await fetch(`/api/ledger-entries?startDate=${fiscalYearBounds.fiscalYearStartISO}&endDate=${fiscalYearBounds.fiscalYearEndISO}`);
      if (!response.ok) throw new Error('Failed to fetch ledger entries');
      return response.json();
    },
    enabled: activeTab === 'general-ledger',
  });
  
  // Fetch accounts (for general ledger to determine account types)
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: activeTab === 'general-ledger',
  });
  
  // Helper function to determine if an account is a balance sheet account
  const isBalanceSheetAccount = (accountType: string) => {
    const balanceSheetTypes = [
      'bank', 'current_assets', 'accounts_receivable', 'inventory',
      'property_plant_equipment', 'long_term_assets',
      'accounts_payable', 'credit_card', 'current_liabilities', 'long_term_liabilities',
      'equity', 'retained_earnings'
    ];
    return balanceSheetTypes.includes(accountType);
  };
  
  // Get selected account details
  const selectedAccount = selectedAccountId 
    ? accounts?.find(acc => acc.id === selectedAccountId)
    : undefined;
  
  // Fetch opening balance for balance sheet accounts
  const { data: openingBalanceData } = useQuery<{ openingBalance: number }>({
    queryKey: ['/api/ledger-entries/opening-balance', selectedAccountId, fiscalYearBounds.fiscalYearStartISO],
    queryFn: async () => {
      const response = await fetch(
        `/api/ledger-entries/opening-balance?accountId=${selectedAccountId}&beforeDate=${fiscalYearBounds.fiscalYearStartISO}`
      );
      if (!response.ok) throw new Error('Failed to fetch opening balance');
      return response.json();
    },
    enabled: activeTab === 'general-ledger' && 
             !!selectedAccountId && 
             !!selectedAccount &&
             isBalanceSheetAccount(selectedAccount.type),
  });
  
  // Filter ledger entries by selected account if one is selected
  const filteredLedgerEntries = selectedAccountId && ledgerEntries
    ? ledgerEntries.filter(entry => entry.accountId === selectedAccountId)
    : ledgerEntries;
  
  // Helper function to determine if an account is debit-normal
  const isDebitNormal = (accountType: string) => {
    const debitNormalTypes = [
      'bank', 'current_assets', 'accounts_receivable', 'inventory', 
      'property_plant_equipment', 'long_term_assets',
      'expenses', 'cost_of_goods_sold', 'other_expense'
    ];
    return debitNormalTypes.includes(accountType);
  };
  
  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Render sort icon
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };
  
  // Handle transaction row click
  const handleTransactionClick = (transactionId: number, transactionType: string) => {
    if (!transactionId || !transactionType) {
      console.warn('Cannot navigate: missing transaction ID or type');
      return;
    }
    
    switch (transactionType) {
      case 'invoice':
        setLocation(`/invoices/${transactionId}`);
        break;
      case 'payment':
        setLocation(`/payments/${transactionId}`);
        break;
      case 'bill':
        setLocation(`/bills/${transactionId}`);
        break;
      case 'deposit':
        setLocation(`/deposits/${transactionId}`);
        break;
      case 'expense':
        // Expenses don't have individual view pages, navigate to expenses page
        setLocation('/expenses');
        break;
      case 'journal_entry':
        // Journal entries don't have individual view pages, navigate to journals page
        setLocation('/journals');
        break;
      default:
        console.warn(`Unknown transaction type: ${transactionType}`);
    }
  };
  
  // First sort by date for running balance calculation
  const dateSortedLedgerEntries = filteredLedgerEntries
    ? [...filteredLedgerEntries].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id - b.id;
      })
    : [];
  
  // Calculate running balance for the selected account
  // For balance sheet accounts, start from opening balance; for income statement accounts, start from 0
  const startingBalance = (selectedAccount && isBalanceSheetAccount(selectedAccount.type) && openingBalanceData)
    ? openingBalanceData.openingBalance
    : 0;
  
  const ledgerEntriesWithBalanceUnsorted = dateSortedLedgerEntries.reduce((acc: any[], entry) => {
    const account = accounts?.find(acc => acc.id === entry.accountId);
    const accountType = account?.type || '';
    const isDebitNormalAccount = isDebitNormal(accountType);
    
    // Get previous balance (starting balance if first entry, otherwise last entry's balance)
    const prevBalance = acc.length === 0 ? startingBalance : acc[acc.length - 1].runningBalance;
    
    // Calculate delta based on account normal side
    const debit = Math.max(0, Number(entry.debit || 0));
    const credit = Math.max(0, Number(entry.credit || 0));
    
    let runningBalance;
    if (isDebitNormalAccount) {
      // For debit-normal accounts: increase on debit, decrease on credit
      runningBalance = prevBalance + debit - credit;
    } else {
      // For credit-normal accounts: decrease on debit, increase on credit
      runningBalance = prevBalance - debit + credit;
    }
    
    acc.push({
      ...entry,
      runningBalance,
      debitAmount: debit,
      creditAmount: credit
    });
    
    return acc;
  }, []);
  
  // Apply user-selected sorting
  const ledgerEntriesWithBalance = [...ledgerEntriesWithBalanceUnsorted].sort((a, b) => {
    let compareValue = 0;
    
    switch (sortColumn) {
      case 'date':
        compareValue = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'referenceNumber':
        const refA = (a.referenceNumber || '').toLowerCase();
        const refB = (b.referenceNumber || '').toLowerCase();
        compareValue = refA.localeCompare(refB);
        break;
      case 'name':
        const nameA = (a.contactName || '').toLowerCase();
        const nameB = (b.contactName || '').toLowerCase();
        compareValue = nameA.localeCompare(nameB);
        break;
      case 'description':
        const descA = (a.description || '').toLowerCase();
        const descB = (b.description || '').toLowerCase();
        compareValue = descA.localeCompare(descB);
        break;
      case 'account':
        const accountA = accounts?.find(acc => acc.id === a.accountId)?.name || '';
        const accountB = accounts?.find(acc => acc.id === b.accountId)?.name || '';
        compareValue = accountA.localeCompare(accountB);
        break;
      case 'debit':
        compareValue = a.debitAmount - b.debitAmount;
        break;
      case 'credit':
        compareValue = a.creditAmount - b.creditAmount;
        break;
      case 'balance':
        compareValue = a.runningBalance - b.runningBalance;
        break;
      default:
        compareValue = 0;
    }
    
    return sortDirection === 'asc' ? compareValue : -compareValue;
  });
  
  // Calculate totals for General Ledger
  const totalDebits = ledgerEntriesWithBalance.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0);
  const totalCredits = ledgerEntriesWithBalance.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0);
  
  // Prepare data for charts
  const incomeData = incomeStatement 
    ? [
        { name: 'Revenues', value: incomeStatement.revenues },
        { name: 'Expenses', value: incomeStatement.expenses },
        { name: 'Net Income', value: incomeStatement.netIncome }
      ]
    : [];
  
  const balanceData = balanceSheet
    ? [
        { name: 'Assets', value: balanceSheet.assets },
        { name: 'Liabilities', value: balanceSheet.liabilities },
        { name: 'Equity', value: typeof balanceSheet.equity === 'number' ? balanceSheet.equity : balanceSheet.equity?.total || 0 }
      ]
    : [];
  
  // Colors for the pie chart
  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
  
  // Group accounts by their types for various reports
  const accountsByType: Record<string, any[]> = {};
  
  if (accountBalances) {
    // Group accounts by their types
    // Asset accounts
    accountsByType['asset'] = accountBalances.filter(({ account }) => 
      account.type === 'accounts_receivable' || 
      account.type === 'current_assets' || 
      account.type === 'bank' || 
      account.type === 'property_plant_equipment' || 
      account.type === 'long_term_assets'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Liability accounts
    accountsByType['liability'] = accountBalances.filter(({ account }) => 
      account.type === 'accounts_payable' || 
      account.type === 'credit_card' || 
      account.type === 'other_current_liabilities' ||
      account.type === 'long_term_liabilities'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Equity accounts
    accountsByType['equity'] = accountBalances.filter(({ account }) => 
      account.type === 'equity'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Income accounts
    accountsByType['income'] = accountBalances.filter(({ account }) => 
      account.type === 'income' || 
      account.type === 'other_income'
    ).map(({ account, balance }) => ({
      ...account, 
      balance: Math.abs(balance)
    }));
    
    // Expense accounts
    accountsByType['expense'] = accountBalances.filter(({ account }) => 
      account.type === 'expenses' || 
      account.type === 'cost_of_goods_sold' ||
      account.type === 'other_expense'
    ).map(({ account, balance }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
  }
  
  // Transform account balances for pie chart
  const expenseAccounts = accountsByType['expense'] 
    ? accountsByType['expense'].map(account => ({
        name: account.name,
        value: account.balance,
      }))
    : [];
  
  const revenueAccounts = accountsByType['income']
    ? accountsByType['income'].map(account => ({
        name: account.name, 
        value: account.balance,
      }))
    : [];
  
  // Helper function to get report title
  const getReportTitle = (tab: string): string => {
    switch (tab) {
      case 'income-statement':
        return 'Income Statement';
      case 'balance-sheet':
        return 'Balance Sheet';
      case 'general-ledger':
        return 'General Ledger';
      case 'trial-balance':
        return 'Trial Balance';
      case 'expense-analysis':
        return 'Expense Analysis';
      case 'revenue-analysis':
        return 'Revenue Analysis';
      default:
        return 'Financial Reports';
    }
  };
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          View and analyze your financial data
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {activeTab === '' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("income-statement")}
              >
                <CardHeader>
                  <CardTitle>Income Statement</CardTitle>
                  <CardDescription>
                    View your revenues, expenses, and net income for a specific period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The income statement shows how your business performed financially over a specific 
                    time period, displaying revenues earned and expenses incurred.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("balance-sheet")}
              >
                <CardHeader>
                  <CardTitle>Balance Sheet</CardTitle>
                  <CardDescription>
                    Examine your assets, liabilities, and equity at a specific point in time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The balance sheet provides a snapshot of your company's financial position, showing 
                    what you own (assets), what you owe (liabilities), and the resulting net worth (equity).
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("general-ledger")}
              >
                <CardHeader>
                  <CardTitle>General Ledger</CardTitle>
                  <CardDescription>
                    Examine all financial transactions with detailed debit and credit entries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The general ledger provides a complete record of all financial transactions, 
                    showing every debit and credit entry made to each account in your chart of accounts.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>
              
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("trial-balance")}
              >
                <CardHeader>
                  <CardTitle>Trial Balance</CardTitle>
                  <CardDescription>
                    View account balances with debit and credit columns to verify accounting equation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The trial balance report verifies that total debits equal total credits across all accounts,
                    confirming the accounting equation is in balance before creating financial statements.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("expense-analysis")}
              >
                <CardHeader>
                  <CardTitle>Expense Analysis</CardTitle>
                  <CardDescription>
                    Break down your expenses by category to identify spending patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The expense analysis report helps you understand where your money is going by categorizing 
                    and visualizing expense transactions across different accounts and time periods.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors" 
                onClick={() => setActiveTab("revenue-analysis")}
              >
                <CardHeader>
                  <CardTitle>Revenue Analysis</CardTitle>
                  <CardDescription>
                    Analyze your revenue streams to understand your income sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The revenue analysis report helps you track where your income is coming from by breaking down
                    revenue by source, customer, product or service categories.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="ghost" size="sm">View Report →</Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {activeTab !== '' && (
            <div className="mb-6 flex items-center gap-4">
              <Button variant="outline" onClick={() => setActiveTab('')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Reports
              </Button>
              <h2 className="text-xl font-semibold">{getReportTitle(activeTab)}</h2>
            </div>
          )}
            
          <Tabs value={activeTab} defaultValue="income-statement">
            {/* Income Statement */}
            <TabsContent value="income-statement">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fiscal Year</label>
                    <Select 
                      value={selectedFiscalYear.toString()} 
                      onValueChange={handleFiscalYearChange}
                      data-testid="fiscal-year-select-income-statement"
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                      <SelectContent>
                        {fiscalYearOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value.toString()}
                            data-testid={`fiscal-year-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Income Statement</CardTitle>
                      <CardDescription>
                        For the period {format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - {format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    {incomeStatement && !incomeLoading && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('income_statement', fiscalYearBounds.fiscalYearStart, fiscalYearBounds.fiscalYearEnd);
                            exportIncomeStatementToCSV(incomeStatement, accountsByType['income'], accountsByType['expense'], `${filename}.csv`);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('income_statement', fiscalYearBounds.fiscalYearStart, fiscalYearBounds.fiscalYearEnd);
                            exportIncomeStatementToPDF(incomeStatement, accountsByType['income'], accountsByType['expense'], `${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {incomeLoading ? (
                      <div className="text-center py-6">Loading income statement...</div>
                    ) : (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[60%]">Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Revenue Section */}
                            {incomeStatement?.revenue && incomeStatement.revenue.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={2} className="font-semibold text-sm">REVENUE</TableCell>
                                </TableRow>
                                {incomeStatement.revenue.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setSelectedAccountId(account.id);
                                      setActiveTab('general-ledger');
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Revenue</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.revenue.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Cost of Goods Sold Section */}
                            {incomeStatement?.costOfGoodsSold && incomeStatement.costOfGoodsSold.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={2} className="font-semibold text-sm">COST OF GOODS SOLD</TableCell>
                                </TableRow>
                                {incomeStatement.costOfGoodsSold.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setSelectedAccountId(account.id);
                                      setActiveTab('general-ledger');
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Cost of Goods Sold</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.costOfGoodsSold.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Gross Profit */}
                            {incomeStatement?.grossProfit !== undefined && (
                              <TableRow className="border-t-2 bg-blue-50">
                                <TableCell className="font-bold">Gross Profit</TableCell>
                                <TableCell className="text-right font-bold">
                                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.grossProfit)}
                                </TableCell>
                              </TableRow>
                            )}
                            
                            {/* Operating Expenses Section */}
                            {incomeStatement?.operatingExpenses && incomeStatement.operatingExpenses.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OPERATING EXPENSES</TableCell>
                                </TableRow>
                                {incomeStatement.operatingExpenses.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setSelectedAccountId(account.id);
                                      setActiveTab('general-ledger');
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Operating Expenses</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.operatingExpenses.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Operating Income */}
                            {incomeStatement?.operatingIncome !== undefined && (
                              <TableRow className="border-t-2 bg-blue-50">
                                <TableCell className="font-bold">Operating Income</TableCell>
                                <TableCell className="text-right font-bold">
                                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.operatingIncome)}
                                </TableCell>
                              </TableRow>
                            )}
                            
                            {/* Other Income */}
                            {incomeStatement?.otherIncome && incomeStatement.otherIncome.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OTHER INCOME</TableCell>
                                </TableRow>
                                {incomeStatement.otherIncome.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setSelectedAccountId(account.id);
                                      setActiveTab('general-ledger');
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Other Income</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.otherIncome.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Other Expense */}
                            {incomeStatement?.otherExpense && incomeStatement.otherExpense.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-gray-50">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OTHER EXPENSE</TableCell>
                                </TableRow>
                                {incomeStatement.otherExpense.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                                    onClick={() => {
                                      setSelectedAccountId(account.id);
                                      setActiveTab('general-ledger');
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Other Expense</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.otherExpense.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Net Income */}
                            {incomeStatement?.netIncome !== undefined && (
                              <TableRow className="border-t-4 border-double bg-green-50">
                                <TableCell className="font-bold text-lg">NET INCOME</TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                  {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(incomeStatement.netIncome)}
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Income Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={incomeData}
                          margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detailed revenue and expense breakdown */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Detailed Revenue & Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Revenues */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Revenues</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['income'] && accountsByType['income'].length > 0 ? (
                              accountsByType['income'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No revenue accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Expenses */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Expenses</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['expense'] && accountsByType['expense'].length > 0 ? (
                              accountsByType['expense'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No expense accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Balance Sheet */}
            <TabsContent value="balance-sheet">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fiscal Year</label>
                    <Select 
                      value={selectedFiscalYear.toString()} 
                      onValueChange={handleFiscalYearChange}
                      data-testid="fiscal-year-select-balance-sheet"
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                      <SelectContent>
                        {fiscalYearOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value.toString()}
                            data-testid={`fiscal-year-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Balance Sheet</CardTitle>
                      <CardDescription>
                        As of {format(selectedFiscalYear === 'current' ? new Date() : fiscalYearBounds.fiscalYearEnd, 'MMMM d, yyyy')}
                      </CardDescription>
                    </div>
                    {balanceSheet && !balanceLoading && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('balance_sheet');
                            exportBalanceSheetToCSV(
                              balanceSheet, 
                              accountsByType['asset'], 
                              accountsByType['liability'], 
                              accountsByType['equity'], 
                              `${filename}.csv`
                            );
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('balance_sheet');
                            exportBalanceSheetToPDF(
                              balanceSheet, 
                              accountsByType['asset'], 
                              accountsByType['liability'], 
                              accountsByType['equity'], 
                              `${filename}.pdf`
                            );
                          }}
                          label="Export"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {balanceLoading ? (
                      <div className="text-center py-6">Loading balance sheet...</div>
                    ) : (
                      <div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50%]">Item</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="font-medium">Assets</TableCell>
                              <TableCell className="text-right">
                                {balanceSheet?.assets ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.assets) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Liabilities</TableCell>
                              <TableCell className="text-right">
                                {balanceSheet?.liabilities ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.liabilities) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-medium">Equity</TableCell>
                              <TableCell className="text-right" data-testid="balance-sheet-equity-total">
                                {balanceSheet?.equity ? 
                                  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                                    typeof balanceSheet.equity === 'number' ? balanceSheet.equity : balanceSheet.equity?.total || 0
                                  ) : '0.00'}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="font-bold">Liabilities + Equity</TableCell>
                              <TableCell className="text-right font-bold" data-testid="balance-sheet-liabilities-equity-total">
                                {balanceSheet?.liabilities && balanceSheet?.equity ? 
                                  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
                                    balanceSheet.liabilities + (typeof balanceSheet.equity === 'number' ? balanceSheet.equity : balanceSheet.equity?.total || 0)
                                  ) : '0.00'}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Sheet Visualization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={balanceData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {balanceData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Detailed balance sheet breakdown */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle>Detailed Balance Sheet Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Assets */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Assets</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['asset'] && accountsByType['asset'].length > 0 ? (
                              accountsByType['asset'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No asset accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Liabilities */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Liabilities</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : accountsByType['liability'] && accountsByType['liability'].length > 0 ? (
                              accountsByType['liability'].map((account: any) => (
                                <TableRow key={account.id}>
                                  <TableCell>{account.name}</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">No liability accounts found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Equity */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Equity</h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {accountsLoading || balanceLoading ? (
                              <TableRow>
                                <TableCell colSpan={2} className="text-center">Loading...</TableCell>
                              </TableRow>
                            ) : balanceSheet?.equity && typeof balanceSheet.equity === 'object' && balanceSheet.equity.accounts ? (
                              <>
                                {/* Display equity accounts from the new structure */}
                                {balanceSheet.equity.accounts.map((account: any) => (
                                  <TableRow key={account.id} data-testid={`equity-account-${account.id}`}>
                                    <TableCell>{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(account.balance))}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                
                                {/* Retained Earnings (prior years) */}
                                <TableRow data-testid="equity-retained-earnings-row">
                                  <TableCell className="font-medium">Retained Earnings</TableCell>
                                  <TableCell className="text-right" data-testid="equity-retained-earnings">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.equity.retainedEarnings || 0)}
                                  </TableCell>
                                </TableRow>
                                
                                {/* Current Year Net Income */}
                                <TableRow data-testid="equity-current-year-net-income-row">
                                  <TableCell className="font-medium">Net Income (Current Year)</TableCell>
                                  <TableCell className="text-right" data-testid="equity-current-year-net-income">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.equity.currentYearNetIncome || 0)}
                                  </TableCell>
                                </TableRow>
                                
                                {/* Total Equity */}
                                <TableRow className="border-t-2" data-testid="equity-total-row">
                                  <TableCell className="font-bold">Total Equity</TableCell>
                                  <TableCell className="text-right font-bold" data-testid="equity-total">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceSheet.equity.total || 0)}
                                  </TableCell>
                                </TableRow>
                              </>
                            ) : (
                              <>
                                {/* Fallback: Show equity accounts from accountsByType for backward compatibility */}
                                {accountsByType['equity'] && accountsByType['equity'].length > 0 ? (
                                  accountsByType['equity'].map((account: any) => (
                                    <TableRow key={account.id} data-testid={`equity-account-${account.id}`}>
                                      <TableCell>{account.name}</TableCell>
                                      <TableCell className="text-right">
                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.balance)}
                                      </TableCell>
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow>
                                    <TableCell colSpan={2} className="text-center">No equity accounts found</TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* General Ledger */}
            <TabsContent value="general-ledger">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fiscal Year</label>
                    <Select 
                      value={selectedFiscalYear.toString()} 
                      onValueChange={handleFiscalYearChange}
                      data-testid="fiscal-year-select-general-ledger"
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                      <SelectContent>
                        {fiscalYearOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value.toString()}
                            data-testid={`fiscal-year-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>General Ledger</CardTitle>
                      <CardDescription>
                        {selectedAccountId ? (
                          <div className="flex items-center gap-2">
                            <span>Filtered by account for {format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - {format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAccountId(null)}
                              data-testid="button-clear-filter"
                            >
                              Clear Filter
                            </Button>
                          </div>
                        ) : (
                          `View all ledger entries for ${format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - ${format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}`
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ledgerLoading ? (
                      <div className="text-center py-6">Loading general ledger...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('date')}
                                data-testid="header-date"
                              >
                                <div className="flex items-center">
                                  Date
                                  {renderSortIcon('date')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('referenceNumber')}
                                data-testid="header-reference-number"
                              >
                                <div className="flex items-center">
                                  #
                                  {renderSortIcon('referenceNumber')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('name')}
                                data-testid="header-name"
                              >
                                <div className="flex items-center">
                                  Name
                                  {renderSortIcon('name')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('description')}
                                data-testid="header-description"
                              >
                                <div className="flex items-center">
                                  Description
                                  {renderSortIcon('description')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('account')}
                                data-testid="header-account"
                              >
                                <div className="flex items-center">
                                  Account
                                  {renderSortIcon('account')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('debit')}
                                data-testid="header-debit"
                              >
                                <div className="flex items-center justify-end">
                                  Debit
                                  {renderSortIcon('debit')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('credit')}
                                data-testid="header-credit"
                              >
                                <div className="flex items-center justify-end">
                                  Credit
                                  {renderSortIcon('credit')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-gray-100"
                                onClick={() => handleSort('balance')}
                                data-testid="header-balance"
                              >
                                <div className="flex items-center justify-end">
                                  Balance
                                  {renderSortIcon('balance')}
                                </div>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {ledgerEntriesWithBalance && ledgerEntriesWithBalance.length === 0 && 
                             (!selectedAccount || 
                              !isBalanceSheetAccount(selectedAccount.type) || 
                              (openingBalanceData !== undefined && startingBalance === 0)) ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-6 text-gray-500">
                                  {selectedAccountId ? 'No entries found for this account' : 'No entries found in the general ledger'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {/* Opening Balance row for balance sheet accounts */}
                                {selectedAccount && isBalanceSheetAccount(selectedAccount.type) && startingBalance !== 0 && (
                                  <TableRow className="bg-blue-50 font-semibold">
                                    <TableCell colSpan={4}>Opening Balance</TableCell>
                                    <TableCell>{selectedAccount.name}</TableCell>
                                    <TableCell className="text-right"></TableCell>
                                    <TableCell className="text-right"></TableCell>
                                    <TableCell className="text-right font-medium" data-testid="opening-balance">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(startingBalance))}
                                    </TableCell>
                                  </TableRow>
                                )}
                                {ledgerEntriesWithBalance && ledgerEntriesWithBalance.map((entry: any) => {
                                  const accountName = accounts?.find(
                                    (account) => account.id === entry.accountId
                                  )?.name || 'Unknown Account';
                                  
                                  return (
                                    <TableRow 
                                      key={entry.id}
                                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                                      onClick={() => handleTransactionClick(entry.transactionId, entry.transactionType)}
                                      data-testid={`transaction-row-${entry.transactionId}`}
                                    >
                                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                                      <TableCell>{entry.referenceNumber || ''}</TableCell>
                                      <TableCell>{entry.contactName || '-'}</TableCell>
                                      <TableCell>{entry.description}</TableCell>
                                      <TableCell>{accountName}</TableCell>
                                      <TableCell className="text-right">
                                        {entry.debitAmount > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.debitAmount) : ''}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {entry.creditAmount > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.creditAmount) : ''}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(entry.runningBalance))}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {ledgerEntriesWithBalance && ledgerEntriesWithBalance.length > 0 && (
                                  <TableRow className="border-t-2 border-gray-300 font-bold bg-gray-50">
                                    <TableCell colSpan={5} className="text-right">Total</TableCell>
                                    <TableCell className="text-right" data-testid="total-debits">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDebits)}
                                    </TableCell>
                                    <TableCell className="text-right" data-testid="total-credits">
                                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCredits)}
                                    </TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Trial Balance */}
            <TabsContent value="trial-balance">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Fiscal Year</label>
                    <Select 
                      value={selectedFiscalYear.toString()} 
                      onValueChange={handleFiscalYearChange}
                      data-testid="fiscal-year-select-trial-balance"
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select fiscal year" />
                      </SelectTrigger>
                      <SelectContent>
                        {fiscalYearOptions.map((option) => (
                          <SelectItem 
                            key={option.value} 
                            value={option.value.toString()}
                            data-testid={`fiscal-year-option-${option.value}`}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div>
                        <CardTitle>Trial Balance</CardTitle>
                        <CardDescription>
                          As of {format(fiscalYearBounds.asOfDate, "MMMM d, yyyy")}
                        </CardDescription>
                      </div>
                      {trialBalanceData && !trialBalanceLoading && (
                        <div className="mt-2 sm:mt-0">
                          <ExportMenu
                            onExportCSV={() => {
                              if (!trialBalanceData || trialBalanceLoading) return;
                              
                              const filename = generateFilename('trial_balance');
                              // Export trial balance to CSV
                              const csvData = trialBalanceData.map((item: any) => ({
                                'Account Code': item.account.code,
                                'Account Name': item.account.name,
                                'Debit': item.debitBalance > 0 ? item.debitBalance.toFixed(2) : '',
                                'Credit': item.creditBalance > 0 ? item.creditBalance.toFixed(2) : '',
                              }));
                              
                              // Add totals row using integer arithmetic for precision
                              const totalDebitCents = trialBalanceData.reduce((sum: number, item: any) => sum + Math.round(item.debitBalance * 100), 0);
                              const totalCreditCents = trialBalanceData.reduce((sum: number, item: any) => sum + Math.round(item.creditBalance * 100), 0);
                              csvData.push({
                                'Account Code': '',
                                'Account Name': 'Total',
                                'Debit': (totalDebitCents / 100).toFixed(2),
                                'Credit': (totalCreditCents / 100).toFixed(2),
                              });
                              
                              const csv = Papa.unparse(csvData);
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.setAttribute('href', url);
                              link.setAttribute('download', `${filename}.csv`);
                              link.style.visibility = 'hidden';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            onExportPDF={() => {
                              if (!trialBalanceData || trialBalanceLoading) return;
                              
                              const filename = generateFilename('trial_balance');
                              // Export trial balance to PDF
                              const doc = new jsPDF();
                              
                              // Add title
                              doc.setFontSize(18);
                              doc.text('Trial Balance', 14, 22);
                              
                              // Add date
                              doc.setFontSize(11);
                              doc.text(`As of: ${new Date().toLocaleDateString()}`, 14, 30);
                              
                              // Prepare table data
                              const tableData = trialBalanceData.map((item: any) => [
                                item.account.code,
                                item.account.name,
                                item.debitBalance > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.debitBalance) : '',
                                item.creditBalance > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.creditBalance) : '',
                              ]);
                              
                              // Add totals row using integer arithmetic for precision
                              const totalDebitCents = trialBalanceData.reduce((sum: number, item: any) => sum + Math.round(item.debitBalance * 100), 0);
                              const totalCreditCents = trialBalanceData.reduce((sum: number, item: any) => sum + Math.round(item.creditBalance * 100), 0);
                              tableData.push([
                                '',
                                'Total',
                                new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDebitCents / 100),
                                new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCreditCents / 100),
                              ]);
                              
                              (doc as any).autoTable({
                                head: [['Account Code', 'Account Name', 'Debit', 'Credit']],
                                body: tableData,
                                startY: 40,
                                theme: 'grid',
                                styles: { halign: 'right' },
                                columnStyles: {
                                  0: { halign: 'left' },
                                  1: { halign: 'left' },
                                },
                                footStyles: { fontStyle: 'bold' },
                              });
                              
                              doc.save(`${filename}.pdf`);
                            }}
                            label="Export"
                          />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {trialBalanceLoading ? (
                      <div className="text-center py-6">Loading trial balance data...</div>
                    ) : trialBalanceData && trialBalanceData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Account Code</TableHead>
                              <TableHead>Account Name</TableHead>
                              <TableHead className="text-right">Debit</TableHead>
                              <TableHead className="text-right">Credit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trialBalanceData.map((item: any, index: number) => (
                              <TableRow 
                                key={index}
                                className="cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => {
                                  setSelectedAccountId(item.account.id);
                                  setActiveTab('general-ledger');
                                }}
                                data-testid={`row-account-${item.account.id}`}
                              >
                                <TableCell>{item.account.code}</TableCell>
                                <TableCell>{item.account.name}</TableCell>
                                <TableCell className="text-right">
                                  {item.debitBalance > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.debitBalance) : ''}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.creditBalance > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.creditBalance) : ''}
                                </TableCell>
                              </TableRow>
                            ))}
                            
                            {/* Calculate totals */}
                            {(() => {
                              const totalDebit = trialBalanceData.reduce((sum: number, item: any) => sum + item.debitBalance, 0);
                              const totalCredit = trialBalanceData.reduce((sum: number, item: any) => sum + item.creditBalance, 0);
                              
                              return (
                                <TableRow className="font-bold">
                                  <TableCell colSpan={2} className="text-right">Total</TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalDebit)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCredit)}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-6">No accounts found to generate a trial balance</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>About the Trial Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p>
                        The trial balance is a worksheet with two columns, "debit" and "credit," that lists 
                        all the accounts with their balances before the financial statements are prepared.
                      </p>
                      <p>
                        <strong>Purpose:</strong> To verify that the total debits equal the total credits. 
                        This ensures that the accounting equation (Assets = Liabilities + Equity) is in balance.
                      </p>
                      <p>
                        <strong>Important:</strong> A balanced trial balance does not guarantee that there are no errors in
                        the individual ledger entries. It only confirms that the total debits equal the total credits.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Expense Analysis */}
            <TabsContent value="expense-analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Expense Distribution</CardTitle>
                      <CardDescription>Breakdown of expenses by category</CardDescription>
                    </div>
                    {expenseAccounts && expenseAccounts.length > 0 && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('expense_analysis');
                            const data = expenseAccounts.map(account => ({
                              Account: account.name,
                              Amount: account.value,
                              Percentage: ((account.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1) + '%'
                            }));
                            
                            const csv = Papa.unparse({
                              fields: ['Account', 'Amount', 'Percentage'],
                              data
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `${filename}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('expense_analysis');
                            const doc = new jsPDF();
                            
                            // Add title
                            doc.setFontSize(18);
                            doc.text('Expense Analysis', 14, 22);
                            
                            // Add date
                            doc.setFontSize(11);
                            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                            
                            const tableRows = expenseAccounts.map(account => [
                              account.name,
                              new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.value),
                              ((account.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1) + '%'
                            ]);
                            
                            (doc as any).autoTable({
                              head: [['Expense Account', 'Amount', 'Percentage']],
                              body: tableRows,
                              startY: 40,
                              theme: 'grid'
                            });
                            
                            doc.save(`${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expenseAccounts}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {expenseAccounts.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expense Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : expenseAccounts.length > 0 ? (
                          expenseAccounts.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.value)}
                              </TableCell>
                              <TableCell className="text-right">
                                {((item.value / (incomeStatement?.expenses || 1)) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">No expense data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            {/* Revenue Analysis */}
            <TabsContent value="revenue-analysis">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row justify-between">
                    <div>
                      <CardTitle>Revenue Distribution</CardTitle>
                      <CardDescription>Breakdown of revenue by source</CardDescription>
                    </div>
                    {revenueAccounts && revenueAccounts.length > 0 && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('revenue_analysis');
                            const data = revenueAccounts.map(account => ({
                              Account: account.name,
                              Amount: account.value,
                              Percentage: ((account.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1) + '%'
                            }));
                            
                            const csv = Papa.unparse({
                              fields: ['Account', 'Amount', 'Percentage'],
                              data
                            });
                            
                            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.setAttribute('href', url);
                            link.setAttribute('download', `${filename}.csv`);
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('revenue_analysis');
                            const doc = new jsPDF();
                            
                            // Add title
                            doc.setFontSize(18);
                            doc.text('Revenue Analysis', 14, 22);
                            
                            // Add date
                            doc.setFontSize(11);
                            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
                            
                            const tableRows = revenueAccounts.map(account => [
                              account.name,
                              new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.value),
                              ((account.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1) + '%'
                            ]);
                            
                            (doc as any).autoTable({
                              head: [['Revenue Account', 'Amount', 'Percentage']],
                              body: tableRows,
                              startY: 40,
                              theme: 'grid'
                            });
                            
                            doc.save(`${filename}.pdf`);
                          }}
                          label="Export"
                        />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueAccounts}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {revenueAccounts.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Revenue Account</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountsLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">Loading...</TableCell>
                          </TableRow>
                        ) : revenueAccounts.length > 0 ? (
                          revenueAccounts.map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-right">
                                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.value)}
                              </TableCell>
                              <TableCell className="text-right">
                                {((item.value / (incomeStatement?.revenues || 1)) * 100).toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center">No revenue data available</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}