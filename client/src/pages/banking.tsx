import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { 
  Building2,
  RefreshCw,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Plus,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Paperclip,
  Send,
  GripVertical
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BankAccount, ImportedTransaction } from "@shared/schema";
import BankFeedSetupDialog from "@/components/bank-feed-setup-dialog";

interface GLAccount {
  id: number;
  name: string;
  code: string;
  type: string;
  balance: number;
}

type SortField = 'date' | 'description' | null;
type SortDirection = 'asc' | 'desc';

interface ColumnWidths {
  checkbox: number;
  date: number;
  description: number;
  name: number;
  payments: number;
  deposits: number;
  account: number;
  tax: number;
  matchCategorize: number;
  docs: number;
  action: number;
}

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  checkbox: 48,
  date: 120,
  description: 250,
  name: 200,
  payments: 120,
  deposits: 120,
  account: 200,
  tax: 150,
  matchCategorize: 180,
  docs: 60,
  action: 100,
};

export default function Banking() {
  const { toast } = useToast();
  const [showBankFeedSetup, setShowBankFeedSetup] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [transactionMatchModes, setTransactionMatchModes] = useState<Map<number, 'match' | 'categorize'>>(new Map());
  const [transactionNames, setTransactionNames] = useState<Map<number, string>>(new Map());
  const [transactionAccounts, setTransactionAccounts] = useState<Map<number, number | null>>(new Map());
  const [transactionTaxes, setTransactionTaxes] = useState<Map<number, number | null>>(new Map());

  // Column widths state with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() => {
    try {
      const saved = localStorage.getItem('banking-column-widths');
      return saved ? JSON.parse(saved) : DEFAULT_COLUMN_WIDTHS;
    } catch {
      return DEFAULT_COLUMN_WIDTHS;
    }
  });

  const [resizing, setResizing] = useState<{
    column: keyof ColumnWidths;
    startX: number;
    startWidth: number;
  } | null>(null);

  // Save column widths to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('banking-column-widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Handle resize start
  const handleResizeStart = (column: keyof ColumnWidths, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column],
    });
  };

  // Handle resize move
  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff); // Minimum 50px
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Fetch GL accounts eligible for bank feeds
  const { data: glAccounts = [], isLoading: glAccountsLoading } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
    select: (data: GLAccount[]) => {
      // Filter accounts that can have bank feeds:
      // Cash, Bank Accounts, Investment Accounts, Credit Cards, Line of Credit, Loans
      const eligibleTypes = [
        'current_assets',           // Cash and current investment accounts
        'bank',                     // Bank accounts
        'long_term_assets',         // Long-term investment accounts
        'credit_card',              // Credit card accounts
        'other_current_liabilities', // Line of credit and short-term loans
        'long_term_liabilities'     // Long-term loans
      ];
      return data.filter(acc => eligibleTypes.includes(acc.type));
    },
  });

  // Fetch bank accounts (Plaid connections)
  const { data: bankAccounts = [], isLoading: bankAccountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/plaid/accounts'],
  });

  // Fetch all GL accounts for categorization dropdown
  const { data: allAccounts = [] } = useQuery<GLAccount[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch contacts for Name dropdown
  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['/api/contacts'],
  });

  // Transform contacts for SearchableSelect
  const contactItems: SearchableSelectItem[] = contacts.map(contact => ({
    value: contact.name,
    label: contact.name,
    subtitle: `· ${contact.type}`
  }));

  // Transform accounts for SearchableSelect
  const accountItems: SearchableSelectItem[] = allAccounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: undefined
  }));

  // Fetch sales tax rates (filter out composite tax components)
  const { data: salesTaxes = [] } = useQuery<any[]>({
    queryKey: ['/api/sales-taxes'],
    select: (data: any[]) => {
      // Only show main taxes, not composite tax components (those with parent_id)
      return data.filter(tax => !tax.parentId);
    },
  });

  // Transform sales taxes for SearchableSelect
  const taxItems: SearchableSelectItem[] = [
    { value: 'none', label: 'No tax', subtitle: undefined },
    ...salesTaxes.map(tax => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    }))
  ];

  // Transform page size options for SearchableSelect
  const pageSizeItems: SearchableSelectItem[] = [
    { value: "25", label: "25 per page", subtitle: undefined },
    { value: "50", label: "50 per page", subtitle: undefined },
    { value: "100", label: "100 per page", subtitle: undefined }
  ];

  // Fetch imported transactions
  const { data: importedTransactions = [], isLoading: transactionsLoading } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/plaid/imported-transactions?status=unmatched');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (bankAccountId: number) => {
      return await apiRequest(`/api/plaid/sync-transactions/${bankAccountId}`, 'POST');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      toast({
        title: "Success",
        description: `Synced ${data.synced} new transactions`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync transactions",
        variant: "destructive",
      });
    },
  });

  // Delete bank account mutation
  const deleteBankAccountMutation = useMutation({
    mutationFn: async (bankAccountId: number) => {
      return await apiRequest(`/api/plaid/accounts/${bankAccountId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Bank feed disconnected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect bank feed",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Group GL accounts with their bank feed status - only show accounts with feeds
  const accountsWithFeedStatus = glAccounts
    .map(glAccount => {
      const bankAccount = bankAccounts.find(ba => ba.linkedAccountId === glAccount.id);
      const csvImports = importedTransactions.filter(tx => 
        tx.source === 'csv' && tx.accountId === glAccount.id
      );
      
      return {
        ...glAccount,
        bankAccount,
        hasCSVImports: csvImports.length > 0,
        feedType: bankAccount ? 'plaid' : csvImports.length > 0 ? 'csv' : null
      };
    })
    .filter(account => account.feedType !== null); // Only show accounts with bank feeds connected

  // Filter transactions by selected account
  let filteredTransactions = selectedAccountId 
    ? importedTransactions.filter(tx => tx.accountId === selectedAccountId)
    : importedTransactions;

  // Sort transactions
  if (sortField) {
    filteredTransactions = [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'description') {
        comparison = a.name.localeCompare(b.name);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Clamp currentPage when totalPages changes (e.g., transactions removed or account switched)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Reset to page 1 when account selection changes
  const handleAccountSelect = (accountId: number) => {
    setSelectedAccountId(accountId);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all transactions in the filtered set (not just current page)
      setSelectedTransactions(new Set(filteredTransactions.map(tx => tx.id)));
    } else {
      setSelectedTransactions(new Set());
    }
  };

  const handleSelectTransaction = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleToggleMatchMode = (txId: number, mode: 'match' | 'categorize') => {
    setTransactionMatchModes(new Map(transactionMatchModes).set(txId, mode));
  };

  const handleNameChange = (txId: number, name: string) => {
    setTransactionNames(new Map(transactionNames).set(txId, name));
  };

  const handleAccountChange = (txId: number, accountId: number | null) => {
    setTransactionAccounts(new Map(transactionAccounts).set(txId, accountId));
  };

  const handleTaxChange = (txId: number, taxId: number | null) => {
    setTransactionTaxes(new Map(transactionTaxes).set(txId, taxId));
  };

  const getMatchMode = (txId: number): 'match' | 'categorize' => {
    return transactionMatchModes.get(txId) || 'categorize'; // Default to categorize
  };

  const allSelected = paginatedTransactions.length > 0 && 
    paginatedTransactions.every(tx => selectedTransactions.has(tx.id));

  // Determine if the selected account is AP or AR type
  const selectedAccount = accountsWithFeedStatus.find(a => a.id === selectedAccountId);

  return (
    <div className="py-6">
      <div className="px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Banking</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage bank feeds for your Chart of Accounts
            </p>
          </div>
          <Button
            onClick={() => setShowBankFeedSetup(true)}
            data-testid="button-setup-bank-feed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Set Up Bank Feed
          </Button>
        </div>

        {/* Bank Accounts with Feed Status */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts with Bank Feeds</CardTitle>
              <CardDescription>
                Connect bank feeds to automatically import transactions for Cash, Bank, Investment, Credit Card, Line of Credit, and Loan accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {glAccountsLoading || bankAccountsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : accountsWithFeedStatus.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No bank feeds connected yet</AlertTitle>
                  <AlertDescription>
                    Click "Set Up Bank Feed" above to connect Plaid or upload CSV statements for your Cash, Bank, Investment, Credit Card, Line of Credit, or Loan accounts.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {accountsWithFeedStatus.map((account) => (
                      <div
                        key={account.id}
                        onClick={() => handleAccountSelect(account.id)}
                        className={`flex-shrink-0 w-64 border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedAccountId === account.id 
                            ? 'border-primary bg-primary/5 shadow-md' 
                            : 'border-gray-200 hover:border-primary/50 hover:shadow-sm'
                        }`}
                        data-testid={`tile-account-${account.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Building2 className={`h-5 w-5 flex-shrink-0 ${selectedAccountId === account.id ? 'text-primary' : 'text-gray-400'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">({account.code})</p>
                            <p className="text-sm font-medium mt-2">
                              {formatCurrency(account.balance)}
                            </p>
                            {account.feedType && (
                              <Badge variant={account.feedType === 'plaid' ? 'default' : 'secondary'} className="mt-2">
                                {account.feedType === 'plaid' ? (
                                  <>
                                    <LinkIcon className="h-3 w-3 mr-1" />
                                    Plaid
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-3 w-3 mr-1" />
                                    CSV
                                  </>
                                )}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t flex gap-2">
                          {account.bankAccount ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  syncTransactionsMutation.mutate(account.bankAccount!.id);
                                }}
                                disabled={syncTransactionsMutation.isPending}
                                className="flex-1"
                                data-testid={`button-sync-${account.id}`}
                              >
                                <RefreshCw className={`h-3 w-3 ${syncTransactionsMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBankAccountMutation.mutate(account.bankAccount!.id);
                                }}
                                disabled={deleteBankAccountMutation.isPending}
                                className="flex-1"
                                data-testid={`button-disconnect-${account.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowBankFeedSetup(true);
                              }}
                              className="w-full"
                              data-testid={`button-connect-${account.id}`}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {account.hasCSVImports ? 'Add' : 'Connect'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unmatched Transactions */}
          {accountsWithFeedStatus.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Unmatched Transactions</CardTitle>
                    <CardDescription>
                      {filteredTransactions.length} transactions waiting to be categorized
                      {selectedAccountId && ` for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <SearchableSelect
                      items={pageSizeItems}
                      value={pageSize.toString()}
                      onValueChange={(value) => handlePageSizeChange(Number(value))}
                      placeholder="Select page size"
                      searchPlaceholder="Search..."
                      emptyText="No options found"
                      data-testid="select-page-size"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>No unmatched transactions</AlertTitle>
                    <AlertDescription>
                      {selectedAccountId 
                        ? `All transactions for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name} have been categorized or there are no imports yet.`
                        : 'All transactions have been categorized or there are no imports yet.'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Action Required</AlertTitle>
                      <AlertDescription>
                        You have imported transactions that need to be categorized. These will be available in the transaction matching interface soon.
                      </AlertDescription>
                    </Alert>
                    <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }} className="relative">
                              <Checkbox 
                                checked={allSelected}
                                onCheckedChange={handleSelectAll}
                                data-testid="checkbox-select-all"
                              />
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('checkbox', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }} className="relative">
                              <div className="flex items-center gap-1 cursor-pointer pr-10" onClick={() => handleSort('date')}>
                                Date
                                {sortField === 'date' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('date', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }} className="relative">
                              <div className="flex items-center gap-1 cursor-pointer pr-10" onClick={() => handleSort('description')}>
                                Description
                                {sortField === 'description' ? (
                                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                ) : (
                                  <ArrowUpDown className="h-3 w-3 opacity-50" />
                                )}
                              </div>
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('description', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.payments}px`, minWidth: `${columnWidths.payments}px` }} className="text-right relative pr-10">
                              Payments
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('payments', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.deposits}px`, minWidth: `${columnWidths.deposits}px` }} className="text-right relative pr-10">
                              Deposits
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('deposits', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }} className="relative pr-10">
                              Name
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('name', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }} className="relative pr-10">
                              Account
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('account', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.tax}px`, minWidth: `${columnWidths.tax}px` }} className="relative pr-10">
                              Tax
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('tax', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="relative pr-10">
                              Match/Categorize
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('matchCategorize', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="relative pr-10">
                              Docs
                              <div
                                className="absolute top-0 right-0 w-8 h-full cursor-col-resize hover:bg-primary/20 transition-colors group z-20"
                                onMouseDown={(e) => handleResizeStart('docs', e)}
                              >
                                <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 absolute top-1/2 -translate-y-1/2 right-2 transition-opacity" />
                              </div>
                            </TableHead>
                            <TableHead style={{ width: `${columnWidths.action}px`, minWidth: `${columnWidths.action}px` }} className="relative">
                              Action
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedTransactions.map((tx) => (
                            <TableRow key={tx.id} className="h-12">
                              <TableCell style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }} className="py-2 overflow-hidden">
                                <Checkbox 
                                  checked={selectedTransactions.has(tx.id)}
                                  onCheckedChange={(checked) => handleSelectTransaction(tx.id, checked as boolean)}
                                  data-testid={`checkbox-transaction-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }} className="py-2 overflow-hidden truncate">{format(new Date(tx.date), 'PP')}</TableCell>
                              <TableCell style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }} className="py-2 overflow-hidden">
                                <div className="truncate">
                                  <p className="font-medium truncate">{tx.name}</p>
                                  {tx.merchantName && (
                                    <p className="text-sm text-gray-500 truncate">{tx.merchantName}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.payments}px`, minWidth: `${columnWidths.payments}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) < 0 ? formatCurrency(Math.abs(Number(tx.amount))) : '-'}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.deposits}px`, minWidth: `${columnWidths.deposits}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) > 0 ? formatCurrency(Number(tx.amount)) : '-'}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }} className="py-2 overflow-hidden">
                                <SearchableSelect
                                  items={contactItems}
                                  value={transactionNames.get(tx.id) || ''}
                                  onValueChange={(value) => handleNameChange(tx.id, value)}
                                  placeholder="Select vendor/customer"
                                  searchPlaceholder="Search contacts..."
                                  emptyText="No contacts found."
                                  data-testid={`select-name-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }} className="py-2 overflow-hidden">
                                <SearchableSelect
                                  items={accountItems}
                                  value={transactionAccounts.get(tx.id)?.toString() || ''}
                                  onValueChange={(value) => handleAccountChange(tx.id, value ? Number(value) : null)}
                                  placeholder="Select account"
                                  searchPlaceholder="Search accounts..."
                                  emptyText="No accounts found."
                                  data-testid={`select-account-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.tax}px`, minWidth: `${columnWidths.tax}px` }} className="py-2 overflow-hidden">
                                <SearchableSelect
                                  items={taxItems}
                                  value={transactionTaxes.get(tx.id)?.toString() || 'none'}
                                  onValueChange={(value) => handleTaxChange(tx.id, value === 'none' ? null : Number(value))}
                                  placeholder="No tax"
                                  searchPlaceholder="Search taxes..."
                                  emptyText="No taxes found."
                                  data-testid={`select-tax-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="py-2 overflow-hidden">
                                <ToggleGroup 
                                  type="single" 
                                  value={getMatchMode(tx.id)}
                                  onValueChange={(value) => value && handleToggleMatchMode(tx.id, value as 'match' | 'categorize')}
                                  className="justify-start"
                                  data-testid={`toggle-match-categorize-${tx.id}`}
                                >
                                  <ToggleGroupItem value="match" className="text-xs px-3">
                                    Match
                                  </ToggleGroupItem>
                                  <ToggleGroupItem value="categorize" className="text-xs px-3">
                                    Categorize
                                  </ToggleGroupItem>
                                </ToggleGroup>
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="py-2 overflow-hidden">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  data-testid={`button-attach-${tx.id}`}
                                >
                                  <Paperclip className="h-4 w-4" />
                                </Button>
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.action}px`, minWidth: `${columnWidths.action}px` }} className="py-2 overflow-hidden">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-post-${tx.id}`}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Post
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          data-testid="button-previous-page"
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          data-testid="button-next-page"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bank Feed Setup Dialog */}
      <BankFeedSetupDialog 
        open={showBankFeedSetup} 
        onOpenChange={setShowBankFeedSetup}
      />
    </div>
  );
}
