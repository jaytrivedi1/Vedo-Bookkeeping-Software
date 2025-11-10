import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, FileDown, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Account, LedgerEntry, Company, Preferences } from "@shared/schema";
import { getFiscalYearBounds, getFiscalYearLabel, getFiscalYear } from "@shared/fiscalYear";
import { queryClient } from "@/lib/queryClient";
import ExchangeRatesManager from "@/components/settings/ExchangeRatesManager";

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
};

// Collapsible Balance Sheet Section Component
function BalanceSheetSection({ 
  title, 
  accounts, 
  subtotal,
  defaultOpen = true,
  onAccountClick
}: { 
  title: string; 
  accounts: any[]; 
  subtotal: number;
  defaultOpen?: boolean;
  onAccountClick?: (accountId: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  if (accounts.length === 0) return null;
  
  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between py-2 hover:bg-gray-50 px-2 rounded">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium text-sm text-gray-700">{title}</span>
            </div>
            <span className="font-semibold text-sm">{formatCurrency(subtotal)}</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 space-y-1">
            {accounts.map((account) => (
              <div 
                key={account.id} 
                className="flex justify-between py-1.5 px-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAccountClick) {
                    onAccountClick(account.id);
                  }
                }}
                data-testid={`balance-sheet-account-${account.id}`}
              >
                <span className="text-sm text-gray-600 hover:text-blue-600">{account.name}</span>
                <span className="text-sm text-right">{formatCurrency(account.balance)}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

// Main Balance Sheet Report Component
function BalanceSheetReport({ 
  balanceSheet, 
  onAccountClick 
}: { 
  balanceSheet: any;
  onAccountClick?: (accountId: number) => void;
}) {
  if (!balanceSheet) {
    return <div className="text-center py-6 text-gray-500">No balance sheet data available</div>;
  }

  // Group asset accounts by type
  const currentAssetAccounts = balanceSheet.assets?.accounts?.filter((acc: any) => 
    acc.type === 'bank' || acc.type === 'accounts_receivable' || acc.type === 'current_assets'
  ) || [];
  
  const fixedAssetAccounts = balanceSheet.assets?.accounts?.filter((acc: any) => 
    acc.type === 'property_plant_equipment' || acc.type === 'long_term_assets'
  ) || [];
  
  // Calculate subtotals
  const currentAssetsTotal = currentAssetAccounts.reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);
  const fixedAssetsTotal = fixedAssetAccounts.reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);
  const totalAssets = balanceSheet.totalAssets || balanceSheet.assets?.total || 0;
  
  // Group liability accounts by type
  const currentLiabilityAccounts = balanceSheet.liabilities?.accounts?.filter((acc: any) => 
    acc.type === 'accounts_payable' || 
    acc.type === 'credit_card' || 
    acc.type === 'sales_tax_payable' || 
    acc.type === 'current_liabilities'
  ) || [];
  
  const longTermLiabilityAccounts = balanceSheet.liabilities?.accounts?.filter((acc: any) => 
    acc.type === 'long_term_liabilities' || acc.type === 'loan'
  ) || [];
  
  // Calculate liability subtotals
  const currentLiabilitiesTotal = currentLiabilityAccounts.reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);
  const longTermLiabilitiesTotal = longTermLiabilityAccounts.reduce((sum: number, acc: any) => sum + Math.abs(acc.balance), 0);
  const totalLiabilities = balanceSheet.totalLiabilities || balanceSheet.liabilities?.total || 0;
  
  // Equity
  const equityAccounts = balanceSheet.equity?.accounts || [];
  const retainedEarnings = balanceSheet.equity?.retainedEarnings || 0;
  const currentYearNetIncome = balanceSheet.equity?.currentYearNetIncome || 0;
  const totalEquity = balanceSheet.totalEquity || balanceSheet.equity?.total || 0;
  
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="space-y-6">
      {/* ASSETS SECTION */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">ASSETS</h3>
        
        {/* Current Assets */}
        <BalanceSheetSection
          title="Current Assets"
          accounts={currentAssetAccounts}
          subtotal={currentAssetsTotal}
          defaultOpen={true}
          onAccountClick={onAccountClick}
        />
        
        {/* Fixed Assets */}
        <BalanceSheetSection
          title="Fixed Assets"
          accounts={fixedAssetAccounts}
          subtotal={fixedAssetsTotal}
          defaultOpen={true}
          onAccountClick={onAccountClick}
        />
        
        {/* Total Assets */}
        <div className="flex justify-between py-3 px-2 border-t-2 border-gray-300 mt-2">
          <span className="font-bold text-gray-900">Total Assets</span>
          <span className="font-bold text-gray-900">{formatCurrency(totalAssets)}</span>
        </div>
      </div>
      
      {/* LIABILITIES SECTION */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">LIABILITIES</h3>
        
        {/* Current Liabilities */}
        <BalanceSheetSection
          title="Current Liabilities"
          accounts={currentLiabilityAccounts}
          subtotal={currentLiabilitiesTotal}
          defaultOpen={true}
          onAccountClick={onAccountClick}
        />
        
        {/* Long-term Liabilities */}
        <BalanceSheetSection
          title="Long-term Liabilities"
          accounts={longTermLiabilityAccounts}
          subtotal={longTermLiabilitiesTotal}
          defaultOpen={true}
          onAccountClick={onAccountClick}
        />
        
        {/* Total Liabilities */}
        <div className="flex justify-between py-3 px-2 border-t-2 border-gray-300 mt-2">
          <span className="font-bold text-gray-900">Total Liabilities</span>
          <span className="font-bold text-gray-900">{formatCurrency(totalLiabilities)}</span>
        </div>
      </div>
      
      {/* EQUITY SECTION */}
      <div className="space-y-2 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">EQUITY</h3>
        
        {/* Other Equity Accounts */}
        {equityAccounts.length > 0 && (
          <div className="space-y-1">
            {equityAccounts.map((account: any) => (
              <div 
                key={account.id} 
                className="flex justify-between py-1.5 px-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                onClick={() => onAccountClick && onAccountClick(account.id)}
                data-testid={`balance-sheet-account-${account.id}`}
              >
                <span className="text-sm text-gray-600 hover:text-blue-600">{account.name}</span>
                <span className="text-sm text-right">{formatCurrency(account.balance)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Retained Earnings */}
        <div className="flex justify-between py-1.5 px-2 hover:bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Retained Earnings</span>
          <span className="text-sm text-right">{formatCurrency(retainedEarnings)}</span>
        </div>
        
        {/* Current Year Net Income */}
        <div className="flex justify-between py-1.5 px-2 hover:bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Net Income (Current Year)</span>
          <span className="text-sm text-right">{formatCurrency(currentYearNetIncome)}</span>
        </div>
        
        {/* Total Equity */}
        <div className="flex justify-between py-3 px-2 border-t-2 border-gray-300 mt-2">
          <span className="font-bold text-gray-900">Total Equity</span>
          <span className="font-bold text-gray-900" data-testid="balance-sheet-equity-total">{formatCurrency(totalEquity)}</span>
        </div>
      </div>
      
      {/* TOTAL LIABILITIES & EQUITY */}
      <div className="flex justify-between py-3 px-2 border-t-4 border-double border-gray-400 mt-4">
        <span className="font-bold text-lg text-gray-900">Total Liabilities & Equity</span>
        <span className="font-bold text-lg text-gray-900" data-testid="balance-sheet-liabilities-equity-total">{formatCurrency(totalLiabilitiesAndEquity)}</span>
      </div>
    </div>
  );
}

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
  const { data: company } = useQuery<Company>({
    queryKey: ['/api/companies/default'],
  });
  
  // Fetch preferences to get home currency for exchange rates
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/preferences'],
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
  
  // Helper function to format transaction type for display
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'Invoice';
      case 'payment':
        return 'Payment';
      case 'bill':
        return 'Bill';
      case 'deposit':
        return 'Deposit';
      case 'expense':
        return 'Expense';
      case 'journal_entry':
        return 'Journal Entry';
      case 'cheque':
        return 'Cheque';
      default:
        return type;
    }
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
        setLocation(`/expenses/${transactionId}`);
        break;
      case 'journal_entry':
        setLocation(`/journals/${transactionId}`);
        break;
      case 'cheque':
        setLocation(`/cheques/${transactionId}`);
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
        { name: 'Revenue', value: incomeStatement.revenue?.total || 0 },
        { name: 'Cost of Goods Sold', value: incomeStatement.costOfGoodsSold?.total || 0 },
        { name: 'Operating Expenses', value: incomeStatement.operatingExpenses?.total || 0 },
        { name: 'Net Income', value: Math.abs(incomeStatement.netIncome || 0) }
      ].filter(item => item.value > 0) // Only show categories with values
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
    accountsByType['asset'] = accountBalances.filter(({ account }: { account: Account; balance: number }) => 
      account.type === 'accounts_receivable' || 
      account.type === 'current_assets' || 
      account.type === 'bank' || 
      account.type === 'property_plant_equipment' || 
      account.type === 'long_term_assets'
    ).map(({ account, balance }: { account: Account; balance: number }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Liability accounts
    accountsByType['liability'] = accountBalances.filter(({ account }: { account: Account; balance: number }) => 
      account.type === 'accounts_payable' || 
      account.type === 'credit_card' || 
      account.type === 'other_current_liabilities' ||
      account.type === 'long_term_liabilities'
    ).map(({ account, balance }: { account: Account; balance: number }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Equity accounts
    accountsByType['equity'] = accountBalances.filter(({ account }: { account: Account; balance: number }) => 
      account.type === 'equity'
    ).map(({ account, balance }: { account: Account; balance: number }) => ({
      ...account,
      balance: Math.abs(balance)
    }));
    
    // Income accounts
    accountsByType['income'] = accountBalances.filter(({ account }: { account: Account; balance: number }) => 
      account.type === 'income' || 
      account.type === 'other_income'
    ).map(({ account, balance }: { account: Account; balance: number }) => ({
      ...account, 
      balance: Math.abs(balance)
    }));
    
    // Expense accounts
    accountsByType['expense'] = accountBalances.filter(({ account }: { account: Account; balance: number }) => 
      account.type === 'expenses' || 
      account.type === 'cost_of_goods_sold' ||
      account.type === 'other_expense'
    ).map(({ account, balance }: { account: Account; balance: number }) => ({
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
      case 'journal-entries':
        return 'Journal Entry';
      case 'trial-balance':
        return 'Trial Balance';
      case 'expense-analysis':
        return 'Expense Analysis';
      case 'revenue-analysis':
        return 'Revenue Analysis';
      case 'exchange-rates':
        return 'Exchange Rates';
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
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("income-statement")}
                data-testid="card-income-statement"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Income Statement</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    View your revenues, expenses, and net income for a specific period
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("balance-sheet")}
                data-testid="card-balance-sheet"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Balance Sheet</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Examine your assets, liabilities, and equity at a specific point in time
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("general-ledger")}
                data-testid="card-general-ledger"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">General Ledger</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Examine all financial transactions with detailed debit and credit entries
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("journal-entries")}
                data-testid="card-journal-entries"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Journal Entry</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    View all journal entries with detailed transaction records
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("trial-balance")}
                data-testid="card-trial-balance"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Trial Balance</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    View account balances with debit and credit columns to verify accounting equation
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("expense-analysis")}
                data-testid="card-expense-analysis"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Expense Analysis</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Break down your expenses by category to identify spending patterns
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("revenue-analysis")}
                data-testid="card-revenue-analysis"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Revenue Analysis</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    Analyze your revenue streams to understand your income sources
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Report →</Button>
                </CardFooter>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-primary" 
                onClick={() => setActiveTab("exchange-rates")}
                data-testid="card-exchange-rates"
              >
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Exchange Rates</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    View and manage exchange rates for multi-currency transactions
                  </CardDescription>
                </CardHeader>
                <CardFooter className="pt-4 flex justify-end border-t">
                  <Button variant="ghost" size="sm" className="text-primary">View Rates →</Button>
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
              
              <Card>
                <CardHeader className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <CardTitle>Income Statement</CardTitle>
                      <CardDescription>
                        For the period {format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - {format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}
                      </CardDescription>
                    </div>
                    {incomeStatement && !incomeLoading && accountBalances && (
                      <div className="mt-2 sm:mt-0">
                        <ExportMenu
                          onExportCSV={() => {
                            const filename = generateFilename('income_statement', company?.name);
                            exportIncomeStatementToCSV(incomeStatement, accountBalances, `${filename}.csv`);
                          }}
                          onExportPDF={() => {
                            const filename = generateFilename('income_statement', company?.name);
                            exportIncomeStatementToPDF(incomeStatement, accountBalances, `${filename}.pdf`);
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
              
              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>
                      As of {format(selectedFiscalYear === 'current' ? new Date() : fiscalYearBounds.fiscalYearEnd, 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  {balanceSheet && !balanceLoading && accountBalances && (
                    <div className="mt-2 sm:mt-0">
                      <ExportMenu
                        onExportCSV={() => {
                          const filename = generateFilename('balance_sheet', company?.name);
                          exportBalanceSheetToCSV(
                            balanceSheet, 
                            accountBalances, 
                            `${filename}.csv`
                          );
                        }}
                        onExportPDF={() => {
                          const filename = generateFilename('balance_sheet', company?.name);
                          exportBalanceSheetToPDF(
                            balanceSheet, 
                            accountBalances, 
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
                    <BalanceSheetReport 
                      balanceSheet={balanceSheet}
                      onAccountClick={(accountId) => {
                        setSelectedAccountId(accountId);
                        setActiveTab('general-ledger');
                      }}
                    />
                  )}
                </CardContent>
              </Card>
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
                              <TableHead data-testid="header-type">
                                Type
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
                                <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                                  {selectedAccountId ? 'No entries found for this account' : 'No entries found in the general ledger'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              <>
                                {/* Opening Balance row for balance sheet accounts */}
                                {selectedAccount && isBalanceSheetAccount(selectedAccount.type) && startingBalance !== 0 && (
                                  <TableRow className="bg-blue-50 font-semibold">
                                    <TableCell colSpan={5}>Opening Balance</TableCell>
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
                                      <TableCell>
                                        <span className="text-sm font-medium">
                                          {formatTransactionType(entry.transactionType)}
                                        </span>
                                      </TableCell>
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
                                    <TableCell colSpan={6} className="text-right">Total</TableCell>
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

            {/* Journal Entries */}
            <TabsContent value="journal-entries">
              <Card>
                <CardHeader>
                  <CardTitle>Journal Entry Report</CardTitle>
                  <CardDescription>
                    View all journal entries with detailed transaction records
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground mb-6">
                    Journal entries are available on the dedicated Journal Entries page with full search and filtering capabilities.
                  </p>
                  <Button onClick={() => setLocation('/journals')} data-testid="button-view-journals">
                    View Journal Entries
                  </Button>
                </CardContent>
              </Card>
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
            
            {/* Exchange Rates */}
            <TabsContent value="exchange-rates">
              <Card>
                <CardHeader>
                  <CardTitle>Exchange Rates</CardTitle>
                  <CardDescription>
                    View and manage exchange rates for multi-currency transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {preferences?.multiCurrencyEnabled && preferences?.homeCurrency ? (
                    <ExchangeRatesManager homeCurrency={preferences.homeCurrency} />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Multi-currency is not enabled.</p>
                      <p className="text-sm mt-2">Enable multi-currency in Settings to manage exchange rates.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}