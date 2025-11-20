import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, FileDown, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, ChevronRight, Menu, X, Star, Search } from "lucide-react";
import { useLocation, useSearch } from "wouter";
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
import { Input } from "@/components/ui/input";
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
import { formatReportAmount } from "@/lib/currencyUtils";

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
          <div className="flex items-center justify-between py-2 hover:bg-primary/5 px-2 rounded">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium text-sm text-foreground">{title}</span>
            </div>
            <span className="font-semibold text-sm">{formatReportAmount(subtotal)}</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 space-y-1">
            {accounts.map((account) => (
              <div 
                key={account.id} 
                className="flex justify-between py-1.5 px-2 hover:bg-primary/5 rounded cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAccountClick) {
                    onAccountClick(account.id);
                  }
                }}
                data-testid={`balance-sheet-account-${account.id}`}
              >
                <span className="text-sm text-muted-foreground hover:text-primary">{account.name}</span>
                <span className="text-sm text-right">{formatReportAmount(account.balance)}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

// Collapsible Cash Flow Section Component
function CashFlowSection({ 
  title, 
  accounts, 
  subtotal,
  defaultOpen = true,
  onAccountClick
}: { 
  title: string; 
  accounts: Array<{ account: any; amount: number }>; 
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
          <div className="flex items-center justify-between py-2 hover:bg-primary/5 px-2 rounded">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="font-medium text-sm text-foreground">{title}</span>
            </div>
            <span className="font-semibold text-sm">
              {subtotal >= 0 ? formatReportAmount(subtotal) : `(${formatReportAmount(subtotal)})`}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 space-y-1">
            {accounts.map((item) => (
              <div 
                key={item.account.id} 
                className="flex justify-between py-1.5 px-2 hover:bg-primary/5 rounded cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onAccountClick) {
                    onAccountClick(item.account.id);
                  }
                }}
                data-testid={`cash-flow-account-${item.account.id}`}
              >
                <span className="text-sm text-muted-foreground hover:text-primary">{item.account.name}</span>
                <span className="text-sm text-right">
                  {item.amount >= 0 ? formatReportAmount(item.amount) : `(${formatReportAmount(item.amount)})`}
                </span>
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
    return <div className="text-center py-6 text-muted-foreground">No balance sheet data available</div>;
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
        <h3 className="text-lg font-semibold text-foreground mb-3">ASSETS</h3>
        
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
        <div className="flex justify-between py-3 px-2 border-t-2 border-border mt-2">
          <span className="font-bold text-foreground">Total Assets</span>
          <span className="font-bold text-foreground">{formatReportAmount(totalAssets)}</span>
        </div>
      </div>
      
      {/* LIABILITIES SECTION */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground mb-3">LIABILITIES</h3>
        
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
        <div className="flex justify-between py-3 px-2 border-t-2 border-border mt-2">
          <span className="font-bold text-foreground">Total Liabilities</span>
          <span className="font-bold text-foreground">{formatReportAmount(totalLiabilities)}</span>
        </div>
      </div>
      
      {/* EQUITY SECTION */}
      <div className="space-y-2 pt-4 border-t border-border">
        <h3 className="text-lg font-semibold text-foreground mb-3">EQUITY</h3>
        
        {/* Other Equity Accounts */}
        {equityAccounts.length > 0 && (
          <div className="space-y-1">
            {equityAccounts.map((account: any) => (
              <div 
                key={account.id} 
                className="flex justify-between py-1.5 px-2 hover:bg-primary/5 rounded cursor-pointer transition-colors"
                onClick={() => onAccountClick && onAccountClick(account.id)}
                data-testid={`balance-sheet-account-${account.id}`}
              >
                <span className="text-sm text-muted-foreground hover:text-primary">{account.name}</span>
                <span className="text-sm text-right">{formatReportAmount(account.balance)}</span>
              </div>
            ))}
          </div>
        )}
        
        {/* Retained Earnings */}
        <div className="flex justify-between py-1.5 px-2 hover:bg-primary/5 rounded">
          <span className="text-sm text-muted-foreground">Retained Earnings</span>
          <span className="text-sm text-right">{formatReportAmount(retainedEarnings)}</span>
        </div>
        
        {/* Current Year Net Income */}
        <div className="flex justify-between py-1.5 px-2 hover:bg-primary/5 rounded">
          <span className="text-sm text-muted-foreground">Net Income (Current Year)</span>
          <span className="text-sm text-right">{formatReportAmount(currentYearNetIncome)}</span>
        </div>
        
        {/* Total Equity */}
        <div className="flex justify-between py-3 px-2 border-t-2 border-border mt-2">
          <span className="font-bold text-foreground">Total Equity</span>
          <span className="font-bold text-foreground" data-testid="balance-sheet-equity-total">{formatReportAmount(totalEquity)}</span>
        </div>
      </div>
      
      {/* TOTAL LIABILITIES & EQUITY */}
      <div className="flex justify-between py-3 px-2 border-t-4 border-double border-border mt-4">
        <span className="font-bold text-lg text-foreground">Total Liabilities & Equity</span>
        <span className="font-bold text-lg text-foreground" data-testid="balance-sheet-liabilities-equity-total">{formatReportAmount(totalLiabilitiesAndEquity)}</span>
      </div>
    </div>
  );
}

export default function Reports() {
  const searchString = useSearch();
  const queryParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const tabFromUrl = queryParams.get('tab') || '';
  
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number | 'current'>(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  // Search state
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');
  const [debouncedReportSearch, setDebouncedReportSearch] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReportSearch(reportSearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [reportSearchQuery]);
  
  // Click outside handler to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Favorites state - persisted in localStorage
  const [favoriteReports, setFavoriteReports] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('favoriteReports');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('favoriteReports', JSON.stringify(Array.from(favoriteReports)));
  }, [favoriteReports]);
  
  // Toggle favorite status
  const toggleFavorite = (reportId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavoriteReports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };
  
  // Grouped General Ledger state
  const [ledgerViewType, setLedgerViewType] = useState<'detailed' | 'grouped'>('grouped');
  const [groupedFilterAccountId, setGroupedFilterAccountId] = useState<number | null>(null);
  const [groupedFilterTransactionType, setGroupedFilterTransactionType] = useState<string>('');
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());
  const [expandAll, setExpandAll] = useState(false);
  
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
    queryClient.invalidateQueries({ queryKey: ['/api/reports/cash-flow'] });
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
  
  // Fetch cash flow statement data with fiscal year dates
  const { data: cashFlowStatement, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['/api/reports/cash-flow', fiscalYearBounds.fiscalYearStartISO, fiscalYearBounds.fiscalYearEndISO],
    queryFn: async () => {
      const response = await fetch(`/api/reports/cash-flow?startDate=${fiscalYearBounds.fiscalYearStartISO}&endDate=${fiscalYearBounds.fiscalYearEndISO}`);
      if (!response.ok) throw new Error('Failed to fetch cash flow statement');
      return response.json();
    },
    enabled: activeTab === 'cash-flow',
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
  
  // Fetch grouped general ledger data
  const { data: groupedLedgerData, isLoading: groupedLedgerLoading } = useQuery({
    queryKey: [
      '/api/reports/general-ledger-grouped', 
      fiscalYearBounds.fiscalYearStartISO, 
      fiscalYearBounds.fiscalYearEndISO,
      groupedFilterAccountId,
      groupedFilterTransactionType
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: fiscalYearBounds.fiscalYearStartISO,
        endDate: fiscalYearBounds.fiscalYearEndISO,
      });
      
      if (groupedFilterAccountId) {
        params.append('accountId', groupedFilterAccountId.toString());
      }
      
      if (groupedFilterTransactionType) {
        params.append('transactionType', groupedFilterTransactionType);
      }
      
      const response = await fetch(`/api/reports/general-ledger-grouped?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch grouped general ledger');
      return response.json();
    },
    enabled: activeTab === 'general-ledger' && ledgerViewType === 'grouped',
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
  
  // Handle expand/collapse all for grouped view
  const handleExpandAll = () => {
    if (groupedLedgerData?.accountGroups) {
      const allAccountIds = new Set<number>(groupedLedgerData.accountGroups.map((g: any) => g.account.id));
      setExpandedAccounts(allAccountIds);
      setExpandAll(true);
    }
  };
  
  const handleCollapseAll = () => {
    setExpandedAccounts(new Set());
    setExpandAll(false);
  };
  
  const toggleAccountExpansion = (accountId: number) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
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
      case 'cash-flow':
        return 'Cash Flow Statement';
      case 'general-ledger':
        return 'General Ledger';
      case 'journal-entries':
        return 'Journal Entry';
      case 'trial-balance':
        return 'Trial Balance';
      case 'exchange-rates':
        return 'Exchange Rates';
      default:
        return 'Financial Reports';
    }
  };
  
  // Define report categories and reports
  const reportCategories = [
    {
      id: 'favorites',
      name: 'Favorites',
    },
    {
      id: 'all',
      name: 'All Reports',
    },
    {
      id: 'financial-statements',
      name: 'Financial Statements',
    },
    {
      id: 'accounting-reports',
      name: 'Accounting Reports',
    },
    {
      id: 'multi-currency',
      name: 'Multi-Currency',
    },
  ];
  
  const allReports = [
    {
      id: 'income-statement',
      title: 'Income Statement',
      description: 'View your revenues, expenses, and net income for a specific period',
      category: 'financial-statements',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Examine your assets, liabilities, and equity at a specific point in time',
      category: 'financial-statements',
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Statement',
      description: 'Track cash inflows and outflows from operating, investing, and financing activities',
      category: 'financial-statements',
    },
    {
      id: 'general-ledger',
      title: 'General Ledger',
      description: 'Examine all financial transactions with detailed debit and credit entries',
      category: 'accounting-reports',
    },
    {
      id: 'trial-balance',
      title: 'Trial Balance',
      description: 'View account balances with debit and credit columns to verify accounting equation',
      category: 'accounting-reports',
    },
    {
      id: 'journal-entries',
      title: 'Journal Entry',
      description: 'View all journal entries with detailed transaction records',
      category: 'accounting-reports',
    },
    {
      id: 'exchange-rates',
      title: 'Exchange Rates',
      description: 'View and manage exchange rates for multi-currency transactions',
      category: 'multi-currency',
    },
  ];
  
  // Suggestions for autocomplete (searches across all reports)
  const suggestions = useMemo(() => {
    if (!reportSearchQuery.trim()) return [];
    
    const searchLower = reportSearchQuery.toLowerCase();
    return allReports.filter(report => 
      report.title.toLowerCase().includes(searchLower) ||
      report.description.toLowerCase().includes(searchLower)
    ).slice(0, 5); // Limit to 5 suggestions
  }, [reportSearchQuery]);
  
  // Filter reports by selected category and search query
  const filteredReports = useMemo(() => {
    let reports = selectedCategory === 'favorites'
      ? allReports.filter(report => favoriteReports.has(report.id))
      : selectedCategory === 'all' 
        ? allReports 
        : allReports.filter(report => report.category === selectedCategory);
    
    // Apply search filter if there's a search query
    if (debouncedReportSearch.trim()) {
      const searchLower = debouncedReportSearch.toLowerCase();
      reports = reports.filter(report => 
        report.title.toLowerCase().includes(searchLower) ||
        report.description.toLowerCase().includes(searchLower)
      );
    }
    
    return reports;
  }, [selectedCategory, debouncedReportSearch, favoriteReports]);
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };
  
  // Handle selecting a suggestion
  const handleSelectSuggestion = (report: typeof allReports[0]) => {
    setActiveTab(report.id);
    setReportSearchQuery('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    setSidebarOpen(false);
  };
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Financial Reports
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          View and analyze your financial data
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {activeTab === '' && (
            <div className="flex gap-6">
              {/* Mobile sidebar toggle */}
              <Button
                variant="outline"
                size="sm"
                className="md:hidden fixed top-20 left-4 z-10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                data-testid="button-toggle-sidebar"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Left Sidebar */}
              <div 
                className={cn(
                  "w-64 flex-shrink-0 border-r border-border pr-6",
                  "fixed md:static inset-y-0 left-0 z-20 bg-background md:bg-transparent",
                  "transform transition-transform duration-200 ease-in-out md:transform-none",
                  sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                  "pt-6 md:pt-0"
                )}
              >
                {/* Search Input with Autocomplete */}
                <div className="mb-4 relative" ref={searchContainerRef}>
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    placeholder="Search reports..."
                    value={reportSearchQuery}
                    onChange={(e) => {
                      setReportSearchQuery(e.target.value);
                      setShowSuggestions(true);
                      setSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      if (reportSearchQuery.trim()) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    className="pl-9 w-full"
                    data-testid="input-search-reports"
                  />
                  
                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                          className={cn(
                            "px-4 py-3 cursor-pointer transition-colors border-b border-border last:border-b-0",
                            index === selectedSuggestionIndex
                              ? "bg-primary/10"
                              : "hover:bg-primary/5"
                          )}
                          data-testid={`suggestion-${suggestion.id}`}
                        >
                          <div className="font-medium text-sm text-foreground">
                            {suggestion.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {suggestion.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  {reportCategories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors",
                        selectedCategory === category.id
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-foreground hover:bg-primary/5 hover:text-primary"
                      )}
                      data-testid={`category-${category.id}`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Overlay for mobile */}
              {sidebarOpen && (
                <div 
                  className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}

              {/* Main Content - Report List */}
              <div className="flex-1 min-w-0">
                <div className="space-y-3">
                  {filteredReports.map((report) => (
                    <Card
                      key={report.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 group"
                      onClick={() => setActiveTab(report.id)}
                      data-testid={`report-${report.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-primary group-hover:text-primary/90 transition-colors">
                              {report.title}
                            </CardTitle>
                            <CardDescription className="mt-1.5">
                              {report.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            <button
                              onClick={(e) => toggleFavorite(report.id, e)}
                              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors"
                              data-testid={`star-${report.id}`}
                              aria-label={favoriteReports.has(report.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              <Star 
                                className={cn(
                                  "h-5 w-5 transition-colors",
                                  favoriteReports.has(report.id) 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-muted-foreground hover:text-yellow-400"
                                )}
                              />
                            </button>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
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
                    <label className="text-sm font-medium text-foreground mb-1 block">Fiscal Year</label>
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
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={2} className="font-semibold text-sm">REVENUE</TableCell>
                                </TableRow>
                                {incomeStatement.revenue.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                                    onClick={() => {
                                      setLocation(`/accounts/${account.id}/transactions?back=/reports?tab=income-statement&backLabel=Income Statement`);
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {formatReportAmount(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Revenue</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatReportAmount(incomeStatement.revenue.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Cost of Goods Sold Section */}
                            {incomeStatement?.costOfGoodsSold && incomeStatement.costOfGoodsSold.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={2} className="font-semibold text-sm">COST OF GOODS SOLD</TableCell>
                                </TableRow>
                                {incomeStatement.costOfGoodsSold.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                                    onClick={() => {
                                      setLocation(`/accounts/${account.id}/transactions?back=/reports?tab=income-statement&backLabel=Income Statement`);
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {formatReportAmount(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Cost of Goods Sold</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatReportAmount(incomeStatement.costOfGoodsSold.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Gross Profit */}
                            {incomeStatement?.grossProfit !== undefined && (
                              <TableRow className="border-t-2 bg-blue-50">
                                <TableCell className="font-bold">Gross Profit</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatReportAmount(incomeStatement.grossProfit)}
                                </TableCell>
                              </TableRow>
                            )}
                            
                            {/* Operating Expenses Section */}
                            {incomeStatement?.operatingExpenses && incomeStatement.operatingExpenses.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OPERATING EXPENSES</TableCell>
                                </TableRow>
                                {incomeStatement.operatingExpenses.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                                    onClick={() => {
                                      setLocation(`/accounts/${account.id}/transactions?back=/reports?tab=income-statement&backLabel=Income Statement`);
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {formatReportAmount(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Operating Expenses</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatReportAmount(incomeStatement.operatingExpenses.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Operating Income */}
                            {incomeStatement?.operatingIncome !== undefined && (
                              <TableRow className="border-t-2 bg-blue-50">
                                <TableCell className="font-bold">Operating Income</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatReportAmount(incomeStatement.operatingIncome)}
                                </TableCell>
                              </TableRow>
                            )}
                            
                            {/* Other Income */}
                            {incomeStatement?.otherIncome && incomeStatement.otherIncome.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OTHER INCOME</TableCell>
                                </TableRow>
                                {incomeStatement.otherIncome.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                                    onClick={() => {
                                      setLocation(`/accounts/${account.id}/transactions?back=/reports?tab=income-statement&backLabel=Income Statement`);
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {formatReportAmount(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Other Income</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatReportAmount(incomeStatement.otherIncome.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Other Expense */}
                            {incomeStatement?.otherExpense && incomeStatement.otherExpense.accounts.length > 0 && (
                              <>
                                <TableRow className="bg-muted/30">
                                  <TableCell colSpan={2} className="font-semibold text-sm">OTHER EXPENSE</TableCell>
                                </TableRow>
                                {incomeStatement.otherExpense.accounts.map((account: any) => (
                                  <TableRow 
                                    key={account.id} 
                                    className="cursor-pointer hover:bg-primary/5 transition-colors"
                                    onClick={() => {
                                      setLocation(`/accounts/${account.id}/transactions?back=/reports?tab=income-statement&backLabel=Income Statement`);
                                    }}
                                  >
                                    <TableCell className="pl-6">{account.name}</TableCell>
                                    <TableCell className="text-right">
                                      {formatReportAmount(account.balance)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t-2">
                                  <TableCell className="font-semibold">Total Other Expense</TableCell>
                                  <TableCell className="text-right font-semibold">
                                    {formatReportAmount(incomeStatement.otherExpense.total)}
                                  </TableCell>
                                </TableRow>
                              </>
                            )}
                            
                            {/* Net Income */}
                            {incomeStatement?.netIncome !== undefined && (
                              <TableRow className="border-t-4 border-double bg-green-50">
                                <TableCell className="font-bold text-lg">NET INCOME</TableCell>
                                <TableCell className="text-right font-bold text-lg">
                                  {formatReportAmount(incomeStatement.netIncome)}
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
                    <label className="text-sm font-medium text-foreground mb-1 block">Fiscal Year</label>
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
                        setLocation(`/accounts/${accountId}/transactions?back=/reports?tab=balance-sheet&backLabel=Balance Sheet`);
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Cash Flow Statement */}
            <TabsContent value="cash-flow" data-testid="content-cash-flow">
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-foreground mb-1 block">Fiscal Year</label>
                    <Select 
                      value={selectedFiscalYear.toString()} 
                      onValueChange={handleFiscalYearChange}
                      data-testid="fiscal-year-select-cash-flow"
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
                <CardHeader>
                  <CardTitle>Statement of Cash Flows</CardTitle>
                  <CardDescription>
                    For the period {format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - {format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {cashFlowLoading ? (
                    <div className="text-center py-6">Loading cash flow statement...</div>
                  ) : cashFlowStatement ? (
                    <div className="space-y-6">
                      {/* Operating Activities Section */}
                      {cashFlowStatement.categories?.operating && (
                        <div className="space-y-2">
                          <CashFlowSection
                            title="Cash Flows from Operating Activities"
                            accounts={cashFlowStatement.categories.operating.accounts || []}
                            subtotal={cashFlowStatement.categories.operating.total || 0}
                            defaultOpen={true}
                            onAccountClick={(accountId) => {
                              setLocation(`/accounts/${accountId}/transactions?back=/reports?tab=cash-flow&backLabel=Cash Flow Statement`);
                            }}
                          />
                          <div className="flex justify-between py-2 px-2 border-t border-border">
                            <span className="font-semibold text-foreground">Net Cash from Operating Activities</span>
                            <span className="font-semibold text-foreground">
                              {cashFlowStatement.categories.operating.total >= 0 
                                ? formatReportAmount(cashFlowStatement.categories.operating.total)
                                : `(${formatReportAmount(cashFlowStatement.categories.operating.total)})`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Investing Activities Section */}
                      {cashFlowStatement.categories?.investing && (
                        <div className="space-y-2 pt-4 border-t border-border">
                          <CashFlowSection
                            title="Cash Flows from Investing Activities"
                            accounts={cashFlowStatement.categories.investing.accounts || []}
                            subtotal={cashFlowStatement.categories.investing.total || 0}
                            defaultOpen={true}
                            onAccountClick={(accountId) => {
                              setLocation(`/accounts/${accountId}/transactions?back=/reports?tab=cash-flow&backLabel=Cash Flow Statement`);
                            }}
                          />
                          <div className="flex justify-between py-2 px-2 border-t border-border">
                            <span className="font-semibold text-foreground">Net Cash from Investing Activities</span>
                            <span className="font-semibold text-foreground">
                              {cashFlowStatement.categories.investing.total >= 0 
                                ? formatReportAmount(cashFlowStatement.categories.investing.total)
                                : `(${formatReportAmount(cashFlowStatement.categories.investing.total)})`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Financing Activities Section */}
                      {cashFlowStatement.categories?.financing && (
                        <div className="space-y-2 pt-4 border-t border-border">
                          <CashFlowSection
                            title="Cash Flows from Financing Activities"
                            accounts={cashFlowStatement.categories.financing.accounts || []}
                            subtotal={cashFlowStatement.categories.financing.total || 0}
                            defaultOpen={true}
                            onAccountClick={(accountId) => {
                              setLocation(`/accounts/${accountId}/transactions?back=/reports?tab=cash-flow&backLabel=Cash Flow Statement`);
                            }}
                          />
                          <div className="flex justify-between py-2 px-2 border-t border-border">
                            <span className="font-semibold text-foreground">Net Cash from Financing Activities</span>
                            <span className="font-semibold text-foreground">
                              {cashFlowStatement.categories.financing.total >= 0 
                                ? formatReportAmount(cashFlowStatement.categories.financing.total)
                                : `(${formatReportAmount(cashFlowStatement.categories.financing.total)})`
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Net Change in Cash */}
                      <div className="flex justify-between py-3 px-2 border-t-2 border-border mt-4">
                        <span className="font-bold text-foreground">Net Change in Cash</span>
                        <span className="font-bold text-foreground" data-testid="cash-flow-net-change">
                          {cashFlowStatement.netChange >= 0 
                            ? formatReportAmount(cashFlowStatement.netChange)
                            : `(${formatReportAmount(cashFlowStatement.netChange)})`
                          }
                        </span>
                      </div>
                      
                      {/* Cash Balances */}
                      <div className="space-y-2 pt-4 border-t border-border">
                        <div className="flex justify-between py-1.5 px-2">
                          <span className="text-sm text-muted-foreground">Cash at Beginning of Period</span>
                          <span className="text-sm text-right">{formatReportAmount(cashFlowStatement.openingCash || 0)}</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-2">
                          <span className="text-sm text-muted-foreground">Net Change in Cash</span>
                          <span className="text-sm text-right">
                            {cashFlowStatement.netChange >= 0 
                              ? formatReportAmount(cashFlowStatement.netChange)
                              : `(${formatReportAmount(cashFlowStatement.netChange)})`
                            }
                          </span>
                        </div>
                        <div className="flex justify-between py-3 px-2 border-t-2 border-border">
                          <span className="font-bold text-foreground">Cash at End of Period</span>
                          <span className="font-bold text-foreground" data-testid="cash-flow-closing-cash">
                            {formatReportAmount(cashFlowStatement.closingCash || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">No cash flow data available</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* General Ledger */}
            <TabsContent value="general-ledger">
              <div className="mb-4 space-y-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-foreground mb-1 block">Fiscal Year</label>
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
                
                {/* Filters for Grouped View */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 bg-muted/30 rounded-lg border-border border">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-foreground mb-1 block">Filter by Account</label>
                      <Select 
                        value={groupedFilterAccountId?.toString() || 'all'} 
                        onValueChange={(value) => setGroupedFilterAccountId(value === 'all' ? null : parseInt(value))}
                        data-testid="select-filter-account"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Accounts</SelectItem>
                          {accounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-sm font-medium text-foreground mb-1 block">Filter by Type</label>
                      <Select 
                        value={groupedFilterTransactionType || 'all'} 
                        onValueChange={(value) => setGroupedFilterTransactionType(value === 'all' ? '' : value)}
                        data-testid="select-filter-type"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
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
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExpandAll}
                        disabled={expandAll}
                        data-testid="button-expand-all"
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCollapseAll}
                        disabled={!expandAll && expandedAccounts.size === 0}
                        data-testid="button-collapse-all"
                      >
                        Collapse All
                      </Button>
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>General Ledger {ledgerViewType === 'grouped' && '- Grouped by Account'}</CardTitle>
                      <CardDescription>
                        {ledgerViewType === 'detailed' ? (
                          selectedAccountId ? (
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
                          )
                        ) : (
                          `${format(fiscalYearBounds.fiscalYearStart, 'MMM d, yyyy')} - ${format(fiscalYearBounds.fiscalYearEnd, 'MMM d, yyyy')}`
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {ledgerViewType === 'detailed' ? (
                      ledgerLoading ? (
                        <div className="text-center py-6">Loading general ledger...</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-primary/5"
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
                                className="cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('referenceNumber')}
                                data-testid="header-reference-number"
                              >
                                <div className="flex items-center">
                                  #
                                  {renderSortIcon('referenceNumber')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('name')}
                                data-testid="header-name"
                              >
                                <div className="flex items-center">
                                  Name
                                  {renderSortIcon('name')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('description')}
                                data-testid="header-description"
                              >
                                <div className="flex items-center">
                                  Description
                                  {renderSortIcon('description')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('account')}
                                data-testid="header-account"
                              >
                                <div className="flex items-center">
                                  Account
                                  {renderSortIcon('account')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('debit')}
                                data-testid="header-debit"
                              >
                                <div className="flex items-center justify-end">
                                  Debit
                                  {renderSortIcon('debit')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-primary/5"
                                onClick={() => handleSort('credit')}
                                data-testid="header-credit"
                              >
                                <div className="flex items-center justify-end">
                                  Credit
                                  {renderSortIcon('credit')}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:bg-primary/5"
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
                                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
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
                                      className="cursor-pointer hover:bg-primary/5 transition-colors"
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
                                  <TableRow className="border-t-2 border-border font-bold bg-muted/30">
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
                      )
                    ) : (
                      groupedLedgerLoading ? (
                        <div className="text-center py-6">Loading grouped general ledger...</div>
                      ) : groupedLedgerData && groupedLedgerData.accountGroups ? (
                        <div className="space-y-6">
                          {groupedLedgerData.accountGroups.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                              No accounts found with activity in the selected period
                            </div>
                          ) : (
                            <>
                              {groupedLedgerData.accountGroups.map((group: any) => {
                                const isExpanded = expandedAccounts.has(group.account.id);
                                
                                return (
                                  <Collapsible
                                    key={group.account.id}
                                    open={isExpanded}
                                    onOpenChange={() => toggleAccountExpansion(group.account.id)}
                                    data-testid={`account-group-${group.account.id}`}
                                  >
                                    <div className="border rounded-lg overflow-hidden">
                                      <CollapsibleTrigger className="w-full hover:bg-primary/5 transition-colors">
                                        <div className="flex items-center justify-between p-4 bg-muted/50">
                                          <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                            ) : (
                                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                            )}
                                            <span className="font-semibold text-left">
                                              {group.account.code} - {group.account.name}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-4">
                                            <span className="text-sm text-muted-foreground">
                                              {group.entries.length} transaction{group.entries.length !== 1 ? 's' : ''}
                                            </span>
                                            <span className="font-medium">
                                              Balance: {formatReportAmount(group.endingBalance)}
                                            </span>
                                          </div>
                                        </div>
                                      </CollapsibleTrigger>
                                      
                                      <CollapsibleContent>
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>#</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Memo</TableHead>
                                                <TableHead>Split</TableHead>
                                                <TableHead className="text-right">Amount</TableHead>
                                                <TableHead className="text-right">Balance</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {/* Beginning Balance Row */}
                                              {group.beginningBalance !== 0 && (
                                                <TableRow className="bg-blue-50 font-semibold">
                                                  <TableCell colSpan={6}>Beginning Balance</TableCell>
                                                  <TableCell className="text-right"></TableCell>
                                                  <TableCell className="text-right" data-testid={`beginning-balance-${group.account.id}`}>
                                                    {formatReportAmount(group.beginningBalance)}
                                                  </TableCell>
                                                </TableRow>
                                              )}
                                              
                                              {/* Transaction Rows */}
                                              {group.entries.map((entry: any) => (
                                                <TableRow
                                                  key={entry.id}
                                                  className="cursor-pointer hover:bg-primary/5 transition-colors"
                                                  onClick={() => handleTransactionClick(entry.transactionId, entry.transactionType)}
                                                  data-testid={`grouped-transaction-${entry.transactionId}`}
                                                >
                                                  <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                                                  <TableCell>
                                                    <span className="text-sm font-medium">
                                                      {formatTransactionType(entry.transactionType)}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell>{entry.transactionReference || ''}</TableCell>
                                                  <TableCell>{entry.contactName || '-'}</TableCell>
                                                  <TableCell>{entry.memo || '-'}</TableCell>
                                                  <TableCell>{entry.splitAccountName}</TableCell>
                                                  <TableCell className="text-right">
                                                    {entry.amount > 0 ? '' : '-'}
                                                    {formatReportAmount(entry.amount)}
                                                  </TableCell>
                                                  <TableCell className="text-right font-medium">
                                                    {formatReportAmount(entry.runningBalance)}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                              
                                              {/* Total Row */}
                                              <TableRow className="border-t-2 border-border font-bold bg-muted/30">
                                                <TableCell colSpan={6} className="text-right">
                                                  Total for {group.account.name}
                                                </TableCell>
                                                <TableCell className="text-right" data-testid={`account-total-${group.account.id}`}>
                                                  {group.accountTotal > 0 ? '' : '-'}
                                                  {formatReportAmount(group.accountTotal)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                  {formatReportAmount(group.endingBalance)}
                                                </TableCell>
                                              </TableRow>
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </CollapsibleContent>
                                    </div>
                                  </Collapsible>
                                );
                              })}
                              
                              {/* Grand Total */}
                              <div className="border-t-4 border-double border-border pt-4">
                                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                                  <div className="font-bold text-lg">Grand Total</div>
                                  <div className="flex gap-6">
                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">Total Debits</div>
                                      <div className="font-bold" data-testid="grand-total-debits">
                                        {formatReportAmount(groupedLedgerData.grandTotalDebit)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">Total Credits</div>
                                      <div className="font-bold" data-testid="grand-total-credits">
                                        {formatReportAmount(groupedLedgerData.grandTotalCredit)}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">Accounts</div>
                                      <div className="font-bold">{groupedLedgerData.totalAccounts}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          No data available
                        </div>
                      )
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
                    <label className="text-sm font-medium text-foreground mb-1 block">Fiscal Year</label>
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
                                className="cursor-pointer hover:bg-primary/5 transition-colors"
                                onClick={() => {
                                  setLocation(`/accounts/${item.account.id}/transactions?back=/reports?tab=trial-balance&backLabel=Trial Balance`);
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