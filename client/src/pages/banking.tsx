import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { AttachmentDialog } from "@/components/dialogs/AttachmentDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  GripVertical,
  Search,
  Filter,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BankAccount, ImportedTransaction } from "@shared/schema";
import BankFeedSetupDialog from "@/components/bank-feed-setup-dialog";
import CategorizeTransactionDialog from "@/components/bank-feed-categorization-dialog";
import { formatCurrency as formatCurrencyUtil } from "@shared/utils";

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

// Categorization memory helper functions
const saveCategorization = (merchantName: string, accountId: number, contactName: string | null, salesTaxId: number | null) => {
  try {
    const existing = localStorage.getItem('bank_feed_categorizations');
    const categorizations = existing ? JSON.parse(existing) : {};
    categorizations[merchantName] = {
      accountId,
      contactName,
      salesTaxId,
      lastUsed: Date.now()
    };
    localStorage.setItem('bank_feed_categorizations', JSON.stringify(categorizations));
  } catch (error) {
    console.error('Failed to save categorization:', error);
  }
};

const getCategorization = (merchantName: string): { accountId: number, contactName: string | null, salesTaxId: number | null } | null => {
  try {
    const existing = localStorage.getItem('bank_feed_categorizations');
    if (!existing) return null;
    const categorizations = JSON.parse(existing);
    return categorizations[merchantName] || null;
  } catch (error) {
    console.error('Failed to get categorization:', error);
    return null;
  }
};

export default function Banking() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showBankFeedSetup, setShowBankFeedSetup] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'uncategorized' | 'categorized' | 'deleted'>('uncategorized');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [transactionMatchModes, setTransactionMatchModes] = useState<Map<number, 'match' | 'categorize'>>(new Map());
  const [transactionNames, setTransactionNames] = useState<Map<number, string>>(new Map());
  const [transactionAccounts, setTransactionAccounts] = useState<Map<number, number | null>>(new Map());
  const [transactionTaxes, setTransactionTaxes] = useState<Map<number, number | null>>(new Map());
  const [currentTransactionId, setCurrentTransactionId] = useState<number | null>(null);
  const [attachmentDialogOpen, setAttachmentDialogOpen] = useState(false);
  const [selectedAttachmentTransactionId, setSelectedAttachmentTransactionId] = useState<number | null>(null);
  
  // Categorization dialog state
  const [selectedTransaction, setSelectedTransaction] = useState<ImportedTransaction | null>(null);
  const [categorizationDialogOpen, setCategorizationDialogOpen] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');

  // Reconciliation state
  const [reconcileAccountId, setReconcileAccountId] = useState<number | null>(null);
  const [reconcileStatementDate, setReconcileStatementDate] = useState('');
  const [reconcileStatementBalance, setReconcileStatementBalance] = useState('');
  const [activeReconciliationId, setActiveReconciliationId] = useState<number | null>(null);
  const [clearedEntries, setClearedEntries] = useState<Set<number>>(new Set());

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
  const taxItems: SearchableSelectItem[] = salesTaxes.map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined
  }));

  // Transform page size options for SearchableSelect
  const pageSizeItems: SearchableSelectItem[] = [
    { value: "25", label: "25 per page", subtitle: undefined },
    { value: "50", label: "50 per page", subtitle: undefined },
    { value: "100", label: "100 per page", subtitle: undefined }
  ];

  // Fetch ALL imported transactions (for determining which accounts have feeds)
  const { data: allImportedTransactions = [] } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions/all'],
    queryFn: async () => {
      const response = await fetch('/api/plaid/imported-transactions');
      if (!response.ok) throw new Error('Failed to fetch all transactions');
      return response.json();
    },
  });

  // Fetch imported transactions based on active tab (for displaying in table)
  const { data: importedTransactions = [], isLoading: transactionsLoading } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions', activeTab],
    queryFn: async () => {
      let status = 'unmatched';
      if (activeTab === 'categorized') status = 'matched';
      if (activeTab === 'deleted') status = 'deleted';
      
      const response = await fetch(`/api/plaid/imported-transactions?status=${status}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Fetch matched transaction details for categorized transactions
  const matchedTransactionIds = importedTransactions
    .filter(tx => tx.matchedTransactionId)
    .map(tx => tx.matchedTransactionId);

  const { data: matchedTransactions = [] } = useQuery({
    queryKey: ['/api/transactions/batch', matchedTransactionIds],
    queryFn: async () => {
      if (matchedTransactionIds.length === 0) return [];
      
      const transactions = await Promise.all(
        matchedTransactionIds.map(async (id) => {
          try {
            const response = await fetch(`/api/transactions/${id}`);
            if (!response.ok) return null;
            return response.json();
          } catch {
            return null;
          }
        })
      );
      return transactions.filter(t => t !== null);
    },
    enabled: activeTab === 'categorized' && matchedTransactionIds.length > 0,
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (bankAccountId: number) => {
      return await apiRequest(`/api/plaid/sync-transactions/${bankAccountId}`, 'POST');
    },
    onSuccess: (data) => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
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

  // Categorize transaction mutation
  const categorizeTransactionMutation = useMutation({
    mutationFn: async ({ 
      transactionId, 
      accountId, 
      contactName, 
      salesTaxId, 
      description 
    }: { 
      transactionId: number; 
      accountId: number | null; 
      contactName: string; 
      salesTaxId: number | null; 
      description?: string;
    }) => {
      return await apiRequest(`/api/plaid/categorize-transaction/${transactionId}`, 'POST', {
        accountId,
        contactName,
        salesTaxId,
        description,
      });
    },
    onSuccess: (data) => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: `Transaction categorized as ${data.type}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to categorize transaction",
        variant: "destructive",
      });
    },
  });

  // Delete imported transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/plaid/imported-transactions/${transactionId}`, 'DELETE');
    },
    onSuccess: () => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      toast({
        title: "Success",
        description: "Transaction deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  // Undo transaction categorization mutation
  const undoCategorizationMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return await apiRequest(`/api/plaid/imported-transactions/${transactionId}/undo`, 'POST');
    },
    onSuccess: () => {
      // Invalidate both tab-filtered and all-transactions queries
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Transaction moved back to uncategorized and ledger entries deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to undo categorization",
        variant: "destructive",
      });
    },
  });

  // Create reconciliation mutation
  const createReconciliationMutation = useMutation({
    mutationFn: async (data: { accountId: number; statementDate: string; statementEndingBalance: number }) => {
      return await apiRequest('/api/reconciliations', 'POST', data);
    },
    onSuccess: (data) => {
      setActiveReconciliationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      toast({
        title: "Success",
        description: "Reconciliation started",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start reconciliation",
        variant: "destructive",
      });
    },
  });

  // Fetch active reconciliation details
  const { data: activeReconciliation, isLoading: reconciliationLoading } = useQuery({
    queryKey: ['/api/reconciliations', activeReconciliationId],
    queryFn: async () => {
      if (!activeReconciliationId) return null;
      const response = await fetch(`/api/reconciliations/${activeReconciliationId}`);
      if (!response.ok) throw new Error('Failed to fetch reconciliation');
      return response.json();
    },
    enabled: !!activeReconciliationId,
  });

  // Fetch ledger entries for reconciliation
  const { data: reconciliationLedgerEntries = [], isLoading: ledgerEntriesLoading } = useQuery({
    queryKey: ['/api/reconciliations', activeReconciliationId, 'ledger-entries'],
    queryFn: async () => {
      if (!activeReconciliationId) return [];
      const response = await fetch(`/api/reconciliations/${activeReconciliationId}/ledger-entries`);
      if (!response.ok) throw new Error('Failed to fetch ledger entries');
      return response.json();
    },
    enabled: !!activeReconciliationId,
  });

  // Update reconciliation items mutation
  const updateReconciliationItemsMutation = useMutation({
    mutationFn: async ({ reconciliationId, clearedEntryIds }: { reconciliationId: number; clearedEntryIds: number[] }) => {
      return await apiRequest(`/api/reconciliations/${reconciliationId}/items`, 'PATCH', { clearedEntryIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations', activeReconciliationId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reconciliation items",
        variant: "destructive",
      });
    },
  });

  // Complete reconciliation mutation
  const completeReconciliationMutation = useMutation({
    mutationFn: async (reconciliationId: number) => {
      return await apiRequest(`/api/reconciliations/${reconciliationId}/complete`, 'PATCH');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reconciliations'] });
      setActiveReconciliationId(null);
      setReconcileAccountId(null);
      setReconcileStatementDate('');
      setReconcileStatementBalance('');
      setClearedEntries(new Set());
      toast({
        title: "Success",
        description: "Reconciliation completed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete reconciliation",
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

  // Calculate total table width for fixed table layout
  const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  // Helper function to get matched transaction details
  const getMatchedTransaction = (importedTx: ImportedTransaction) => {
    if (!importedTx.matchedTransactionId) return null;
    return matchedTransactions.find((mt: any) => mt?.transaction?.id === importedTx.matchedTransactionId);
  };

  // Group GL accounts with their bank feed status - only show accounts with feeds
  const accountsWithFeedStatus = glAccounts
    .map(glAccount => {
      const bankAccount = bankAccounts.find(ba => ba.linkedAccountId === glAccount.id);
      // Check ALL imported transactions (not just current tab) to determine if CSV imports exist
      const csvImports = allImportedTransactions.filter(tx => 
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

  // Apply search and filters
  filteredTransactions = filteredTransactions.filter(tx => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = tx.name.toLowerCase().includes(query);
      const matchesMerchant = tx.merchantName?.toLowerCase().includes(query);
      if (!matchesDescription && !matchesMerchant) return false;
    }

    // Date range filter
    if (dateFrom) {
      const txDate = new Date(tx.date);
      const fromDate = new Date(dateFrom);
      if (txDate < fromDate) return false;
    }
    if (dateTo) {
      const txDate = new Date(tx.date);
      const toDate = new Date(dateTo);
      if (txDate > toDate) return false;
    }

    // Amount range filter
    const absAmount = Math.abs(Number(tx.amount));
    if (amountMin && absAmount < Number(amountMin)) return false;
    if (amountMax && absAmount > Number(amountMax)) return false;

    return true;
  });

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

  // Auto-select the first account when there's only one account with feeds
  useEffect(() => {
    if (accountsWithFeedStatus.length === 1 && selectedAccountId === null) {
      setSelectedAccountId(accountsWithFeedStatus[0].id);
    }
  }, [accountsWithFeedStatus, selectedAccountId]);

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
    const newMap = new Map(transactionNames);
    newMap.set(txId, name);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, name);
          });
        }
      }
    }
    
    setTransactionNames(newMap);
  };

  const handleAccountChange = (txId: number, accountId: number | null) => {
    const newMap = new Map(transactionAccounts);
    newMap.set(txId, accountId);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, accountId);
          });
        }
      }
    }
    
    setTransactionAccounts(newMap);
  };

  const handleTaxChange = (txId: number, taxId: number | null) => {
    const newMap = new Map(transactionTaxes);
    newMap.set(txId, taxId);
    
    // Auto-populate if transaction is selected and all selected are same side
    if (selectedTransactions.has(txId) && selectedTransactions.size > 1) {
      const currentTx = filteredTransactions.find(tx => tx.id === txId);
      if (currentTx) {
        const isPayment = Number(currentTx.amount) < 0;
        const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
        const allSameSide = selectedTxs.every(tx => 
          isPayment ? Number(tx.amount) < 0 : Number(tx.amount) > 0
        );
        
        if (allSameSide) {
          selectedTxs.forEach(tx => {
            newMap.set(tx.id, taxId);
          });
        }
      }
    }
    
    setTransactionTaxes(newMap);
  };

  const getMatchMode = (txId: number): 'match' | 'categorize' => {
    return transactionMatchModes.get(txId) || 'categorize'; // Default to categorize
  };

  const handlePostTransaction = (tx: any) => {
    const mode = getMatchMode(tx.id);
    const accountId = transactionAccounts.get(tx.id);
    const contactName = transactionNames.get(tx.id) || '';
    const salesTaxId = transactionTaxes.get(tx.id) || null;

    // Validate required fields
    if (!accountId) {
      toast({
        title: "Error",
        description: "Please select an account to categorize this transaction",
        variant: "destructive",
      });
      return;
    }

    // For now, only categorize mode is supported
    if (mode === 'match') {
      toast({
        title: "Not implemented",
        description: "Transaction matching is not yet implemented. Please use Categorize mode.",
        variant: "destructive",
      });
      return;
    }

    // Categorize the transaction
    categorizeTransactionMutation.mutate({
      transactionId: tx.id,
      accountId,
      contactName,
      salesTaxId,
      description: tx.name,
    }, {
      onSuccess: () => {
        // Save categorization to memory
        const merchantName = tx.merchantName || tx.name;
        saveCategorization(merchantName, accountId, contactName || null, salesTaxId);
      }
    });
  };

  const handleBulkPost = () => {
    if (selectedTransactions.size === 0) return;
    
    // Only allow bulk post in uncategorized tab
    if (activeTab !== 'uncategorized') {
      toast({
        title: "Error",
        description: "Bulk post is only available for uncategorized transactions",
        variant: "destructive",
      });
      return;
    }

    // Get selected transactions
    const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
    
    // Validate all have required fields
    const missingFields: string[] = [];
    selectedTxs.forEach(tx => {
      const accountId = transactionAccounts.get(tx.id);
      if (!accountId) {
        missingFields.push(`Transaction #${tx.id} (${tx.name}) is missing an account`);
      }
    });

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: missingFields.join('; '),
        variant: "destructive",
      });
      return;
    }

    // Post all selected transactions
    let successCount = 0;
    const totalCount = selectedTxs.length;

    selectedTxs.forEach((tx, index) => {
      const accountId = transactionAccounts.get(tx.id)!;
      const contactName = transactionNames.get(tx.id) || '';
      const salesTaxId = transactionTaxes.get(tx.id) || null;

      categorizeTransactionMutation.mutate({
        transactionId: tx.id,
        accountId,
        contactName,
        salesTaxId,
        description: tx.name,
      }, {
        onSuccess: () => {
          successCount++;
          // Save categorization to memory
          const merchantName = tx.merchantName || tx.name;
          saveCategorization(merchantName, accountId, contactName || null, salesTaxId);
          
          // Clear selection and show success toast after last transaction
          if (index === totalCount - 1) {
            setSelectedTransactions(new Set());
            toast({
              title: "Success",
              description: `Successfully posted ${successCount} transaction${successCount !== 1 ? 's' : ''}`,
            });
          }
        },
        onError: () => {
          // Show error toast after last transaction
          if (index === totalCount - 1 && successCount > 0) {
            setSelectedTransactions(new Set());
            toast({
              title: "Partial Success",
              description: `Posted ${successCount} of ${totalCount} transactions. Some transactions failed.`,
              variant: "destructive",
            });
          }
        }
      });
    });
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) return;

    const confirmed = window.confirm(`Are you sure you want to delete ${selectedTransactions.size} transaction${selectedTransactions.size !== 1 ? 's' : ''}?`);
    if (!confirmed) return;

    const selectedTxs = filteredTransactions.filter(tx => selectedTransactions.has(tx.id));
    let successCount = 0;
    const totalCount = selectedTxs.length;

    selectedTxs.forEach((tx, index) => {
      deleteTransactionMutation.mutate(tx.id, {
        onSuccess: () => {
          successCount++;
          // Clear selection and show success toast after last transaction
          if (index === totalCount - 1) {
            setSelectedTransactions(new Set());
            toast({
              title: "Success",
              description: `Successfully deleted ${successCount} transaction${successCount !== 1 ? 's' : ''}`,
            });
          }
        },
        onError: () => {
          // Show error toast after last transaction
          if (index === totalCount - 1 && successCount > 0) {
            setSelectedTransactions(new Set());
            toast({
              title: "Partial Success",
              description: `Deleted ${successCount} of ${totalCount} transactions. Some transactions failed.`,
              variant: "destructive",
            });
          }
        }
      });
    });
  };

  const allSelected = paginatedTransactions.length > 0 && 
    paginatedTransactions.every(tx => selectedTransactions.has(tx.id));

  // Determine if the selected account is AP or AR type
  const selectedAccount = accountsWithFeedStatus.find(a => a.id === selectedAccountId);

  // Handle starting reconciliation
  const handleStartReconciliation = () => {
    if (!reconcileAccountId) {
      toast({
        title: "Error",
        description: "Please select an account to reconcile",
        variant: "destructive",
      });
      return;
    }
    if (!reconcileStatementDate) {
      toast({
        title: "Error",
        description: "Please enter the statement ending date",
        variant: "destructive",
      });
      return;
    }
    if (!reconcileStatementBalance) {
      toast({
        title: "Error",
        description: "Please enter the statement ending balance",
        variant: "destructive",
      });
      return;
    }

    createReconciliationMutation.mutate({
      accountId: reconcileAccountId,
      statementDate: reconcileStatementDate,
      statementEndingBalance: parseFloat(reconcileStatementBalance),
    });
  };

  // Handle toggling cleared status of a ledger entry
  const handleToggleCleared = (entryId: number, isCleared: boolean) => {
    const newClearedEntries = new Set(clearedEntries);
    if (isCleared) {
      newClearedEntries.add(entryId);
    } else {
      newClearedEntries.delete(entryId);
    }
    setClearedEntries(newClearedEntries);
    
    if (activeReconciliationId) {
      updateReconciliationItemsMutation.mutate({
        reconciliationId: activeReconciliationId,
        clearedEntryIds: Array.from(newClearedEntries),
      });
    }
  };

  // Handle canceling reconciliation
  const handleCancelReconciliation = () => {
    setActiveReconciliationId(null);
    setReconcileAccountId(null);
    setReconcileStatementDate('');
    setReconcileStatementBalance('');
    setClearedEntries(new Set());
  };

  // Sync cleared entries from reconciliation data
  useEffect(() => {
    if (activeReconciliation && activeReconciliation.items) {
      const clearedIds = activeReconciliation.items
        .filter((item: any) => item.isCleared)
        .map((item: any) => item.ledgerEntryId);
      setClearedEntries(new Set(clearedIds));
    }
  }, [activeReconciliation]);

  // Auto-suggest categorizations from memory when transactions load
  useEffect(() => {
    if (activeTab === 'uncategorized' && importedTransactions.length > 0) {
      const newAccounts = new Map(transactionAccounts);
      const newNames = new Map(transactionNames);
      const newTaxes = new Map(transactionTaxes);
      let hasChanges = false;

      importedTransactions.forEach(tx => {
        // Skip if already has values set
        if (transactionAccounts.has(tx.id)) return;
        
        // Try to get categorization from memory
        const merchantName = tx.merchantName || tx.name;
        const savedCategorization = getCategorization(merchantName);
        
        if (savedCategorization) {
          newAccounts.set(tx.id, savedCategorization.accountId);
          if (savedCategorization.contactName) {
            newNames.set(tx.id, savedCategorization.contactName);
          }
          if (savedCategorization.salesTaxId) {
            newTaxes.set(tx.id, savedCategorization.salesTaxId);
          }
          hasChanges = true;
        }
      });

      if (hasChanges) {
        setTransactionAccounts(newAccounts);
        setTransactionNames(newNames);
        setTransactionTaxes(newTaxes);
      }
    }
  }, [activeTab, importedTransactions]);

  return (
    <TooltipProvider>
    <div className="py-6">
      <div className="px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Banking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage bank feeds and reconcile accounts
          </p>
        </div>
        
        <Tabs defaultValue="bank-feeds" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="bank-feeds" data-testid="tab-bank-feeds">Bank Feeds</TabsTrigger>
            <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">Reconciliation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bank-feeds">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Bank Feeds</h2>
              <Button
                onClick={() => setShowBankFeedSetup(true)}
                data-testid="button-setup-bank-feed"
              >
                <Plus className="mr-2 h-4 w-4" />
                Set Up Bank Feed
              </Button>
            </div>

            {/* Bank Accounts with Feed Status */}
            <Card className="mb-6">
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
                              
                              {/* Balance Display */}
                              <div className="mt-2 space-y-1">
                                {account.bankAccount && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-gray-500">Bank:</span>
                                    <span className="text-sm font-medium">
                                      {formatCurrency(account.bankAccount.currentBalance || 0)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">Books:</span>
                                  <span className="text-sm font-medium">
                                    {formatCurrency(account.balance)}
                                  </span>
                                </div>
                              </div>
                              
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

                          <div className="mt-3 pt-3 border-t">
                            {account.bankAccount ? (
                              <div className="flex gap-2">
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBankFeedSetup(true);
                                  }}
                                  className="flex-1"
                                  data-testid={`button-upload-csv-${account.id}`}
                                >
                                  <Upload className="h-3 w-3" />
                                </Button>
                              </div>
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

            {/* Imported Transactions */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'uncategorized' | 'categorized' | 'deleted')}>
              <TabsList className="mb-4">
                <TabsTrigger value="uncategorized" data-testid="tab-uncategorized">Uncategorized</TabsTrigger>
                <TabsTrigger value="categorized" data-testid="tab-categorized">Categorized</TabsTrigger>
                <TabsTrigger value="deleted" data-testid="tab-deleted">Deleted</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab}>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <CardTitle>
                          {activeTab === 'uncategorized' && 'Uncategorized Transactions'}
                          {activeTab === 'categorized' && 'Categorized Transactions'}
                          {activeTab === 'deleted' && 'Deleted Transactions'}
                        </CardTitle>
                        <CardDescription>
                          {activeTab === 'uncategorized' && `${filteredTransactions.length} transactions waiting to be categorized`}
                          {activeTab === 'categorized' && `${filteredTransactions.length} transactions have been categorized`}
                          {activeTab === 'deleted' && `${filteredTransactions.length} deleted transactions`}
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
                
                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
                  <div className="lg:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search description or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      data-testid="input-search"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="From date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      placeholder="To date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Min $"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value)}
                      className="w-1/2"
                      data-testid="input-amount-min"
                    />
                    <Input
                      type="number"
                      placeholder="Max $"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value)}
                      className="w-1/2"
                      data-testid="input-amount-max"
                    />
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                {(searchQuery || dateFrom || dateTo || amountMin || amountMax) && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setDateFrom('');
                        setDateTo('');
                        setAmountMin('');
                        setAmountMax('');
                      }}
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear Filters
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {filteredTransactions.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>
                      {activeTab === 'uncategorized' && 'No uncategorized transactions'}
                      {activeTab === 'categorized' && 'No categorized transactions'}
                      {activeTab === 'deleted' && 'No deleted transactions'}
                    </AlertTitle>
                    <AlertDescription>
                      {activeTab === 'uncategorized' && (selectedAccountId 
                        ? `All transactions for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name} have been categorized or there are no imports yet.`
                        : 'All transactions have been categorized or there are no imports yet.')}
                      {activeTab === 'categorized' && (selectedAccountId 
                        ? `No transactions have been categorized for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name} yet.`
                        : 'No transactions have been categorized yet.')}
                      {activeTab === 'deleted' && (selectedAccountId 
                        ? `No deleted transactions for ${accountsWithFeedStatus.find(a => a.id === selectedAccountId)?.name}.`
                        : 'No deleted transactions.')}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Bulk Action Buttons */}
                    {selectedTransactions.size > 0 && (
                      <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-semibold">
                            {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTransactions(new Set())}
                            data-testid="button-clear-selection"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Clear Selection
                          </Button>
                        </div>
                        {activeTab === 'uncategorized' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              onClick={handleBulkPost}
                              disabled={categorizeTransactionMutation.isPending}
                              data-testid="button-bulk-post"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Post Selected
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleBulkDelete}
                              disabled={deleteTransactionMutation.isPending}
                              data-testid="button-bulk-delete"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Selected
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Table container with fixed height and bottom scrollbar always visible */}
                    <div 
                      className="relative"
                      style={{ height: '500px' }}
                    >
                      {/* Horizontal scroll wrapper that contains both header and body */}
                      <div 
                        className="absolute inset-0 overflow-x-auto overflow-y-hidden"
                        id="table-scroll-container"
                      >
                        <div style={{ minWidth: `${totalTableWidth}px` }}>
                          {/* Fixed header */}
                          <div className="sticky top-0 z-10 bg-white border-b">
                            <Table style={{ tableLayout: 'fixed', width: `${totalTableWidth}px` }}>
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
                            </Table>
                          </div>
                          
                          {/* Scrollable body */}
                          <div className="overflow-y-auto" style={{ maxHeight: '450px' }}>
                            <Table style={{ tableLayout: 'fixed', width: `${totalTableWidth}px` }}>
                              <TableBody>
                          {paginatedTransactions.map((tx) => (
                            <TableRow 
                              key={tx.id} 
                              className={`h-12 ${activeTab === 'uncategorized' && !tx.matchedTransactionId ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                              onClick={() => {
                                if (activeTab === 'uncategorized' && !tx.matchedTransactionId) {
                                  setSelectedTransaction(tx);
                                  setCategorizationDialogOpen(true);
                                }
                              }}
                              data-testid={`row-transaction-${tx.id}`}
                            >
                              <TableCell 
                                style={{ width: `${columnWidths.checkbox}px`, minWidth: `${columnWidths.checkbox}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Checkbox 
                                  checked={selectedTransactions.has(tx.id)}
                                  onCheckedChange={(checked) => handleSelectTransaction(tx.id, checked as boolean)}
                                  data-testid={`checkbox-transaction-${tx.id}`}
                                />
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.date}px`, minWidth: `${columnWidths.date}px` }} className="py-2 overflow-hidden truncate">{format(new Date(tx.date), 'PP')}</TableCell>
                              <TableCell style={{ width: `${columnWidths.description}px`, minWidth: `${columnWidths.description}px` }} className="py-2 overflow-hidden">
                                {tx.matchedTransactionId ? (
                                  <div 
                                    className="truncate cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => {
                                      const txType = Number(tx.amount) < 0 ? 'expenses' : 'deposits';
                                      setLocation(`/${txType}/${tx.matchedTransactionId}`);
                                    }}
                                    data-testid={`link-transaction-${tx.id}`}
                                  >
                                    <p className="font-medium truncate text-primary underline">{tx.name}</p>
                                    {tx.merchantName && (
                                      <p className="text-sm text-gray-500 truncate">{tx.merchantName}</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="truncate">
                                    <p className="font-medium truncate">{tx.name}</p>
                                    {tx.merchantName && (
                                      <p className="text-sm text-gray-500 truncate">{tx.merchantName}</p>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.payments}px`, minWidth: `${columnWidths.payments}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) < 0 ? formatCurrency(Math.abs(Number(tx.amount))) : '-'}
                              </TableCell>
                              <TableCell style={{ width: `${columnWidths.deposits}px`, minWidth: `${columnWidths.deposits}px` }} className="text-right font-medium py-2 overflow-hidden truncate">
                                {Number(tx.amount) > 0 ? formatCurrency(Number(tx.amount)) : '-'}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.name}px`, minWidth: `${columnWidths.name}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' ? (
                                  <SearchableSelect
                                    items={contactItems}
                                    value={transactionNames.get(tx.id) || ''}
                                    onValueChange={(value) => handleNameChange(tx.id, value)}
                                    placeholder="Select vendor/customer"
                                    searchPlaceholder="Search contacts..."
                                    emptyText="No contacts found."
                                    data-testid={`select-name-${tx.id}`}
                                  />
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched) return '-';
                                      const contact = contacts.find(c => c.id === matched.transaction.contactId);
                                      return contact ? contact.name : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.account}px`, minWidth: `${columnWidths.account}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' ? (
                                  <SearchableSelect
                                    items={accountItems}
                                    value={transactionAccounts.get(tx.id)?.toString() || ''}
                                    onValueChange={(value) => handleAccountChange(tx.id, value ? Number(value) : null)}
                                    placeholder="Select account"
                                    searchPlaceholder="Search accounts..."
                                    emptyText="No accounts found."
                                    data-testid={`select-account-${tx.id}`}
                                    onAddNew={() => {
                                      setCurrentTransactionId(tx.id);
                                      setShowAddAccountDialog(true);
                                    }}
                                    addNewText="Add New Account"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched || !matched.lineItems || matched.lineItems.length === 0) return '-';
                                      const lineItem = matched.lineItems[0];
                                      const account = glAccounts.find(a => a.id === lineItem.accountId);
                                      return account ? account.name : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell 
                                style={{ width: `${columnWidths.tax}px`, minWidth: `${columnWidths.tax}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {activeTab === 'uncategorized' ? (
                                  <SearchableSelect
                                    items={taxItems}
                                    value={transactionTaxes.get(tx.id)?.toString() || ''}
                                    onValueChange={(value) => handleTaxChange(tx.id, value ? Number(value) : null)}
                                    placeholder="Select Tax"
                                    searchPlaceholder="Search taxes..."
                                    emptyText="No taxes found."
                                    data-testid={`select-tax-${tx.id}`}
                                  />
                                ) : (
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const matched = getMatchedTransaction(tx);
                                      if (!matched || !matched.lineItems || matched.lineItems.length === 0) return '-';
                                      const lineItem = matched.lineItems[0];
                                      if (!lineItem.salesTaxId) return 'No tax';
                                      const tax = salesTaxes.find(t => t.id === lineItem.salesTaxId);
                                      return tax ? `${tax.name} (${tax.rate}%)` : '-';
                                    })()}
                                  </span>
                                )}
                              </TableCell>
                              {activeTab === 'uncategorized' && (
                                <>
                                  <TableCell 
                                    style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} 
                                    className="py-2 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
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
                                  <TableCell 
                                    style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} 
                                    className="py-2 overflow-hidden"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAttachmentTransactionId(tx.id);
                                        setAttachmentDialogOpen(true);
                                      }}
                                      data-testid={`button-attach-${tx.id}`}
                                    >
                                      <Paperclip className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
                              {activeTab !== 'uncategorized' && (
                                <>
                                  <TableCell style={{ width: `${columnWidths.matchCategorize}px`, minWidth: `${columnWidths.matchCategorize}px` }} className="py-2 overflow-hidden">
                                    <span className="text-sm text-gray-500">-</span>
                                  </TableCell>
                                  <TableCell style={{ width: `${columnWidths.docs}px`, minWidth: `${columnWidths.docs}px` }} className="py-2 overflow-hidden">
                                    <span className="text-sm text-gray-500">-</span>
                                  </TableCell>
                                </>
                              )}
                              <TableCell 
                                style={{ width: `${columnWidths.action}px`, minWidth: `${columnWidths.action}px` }} 
                                className="py-2 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex gap-1">
                                  {activeTab === 'uncategorized' && (
                                    <>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => handlePostTransaction(tx)}
                                            disabled={categorizeTransactionMutation.isPending}
                                            data-testid={`button-post-${tx.id}`}
                                          >
                                            <Send className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Post</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => deleteTransactionMutation.mutate(tx.id)}
                                        disabled={deleteTransactionMutation.isPending}
                                        data-testid={`button-delete-${tx.id}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                  {activeTab === 'categorized' && (
                                    <>
                                      {tx.matchedTransactionId && (
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => {
                                            const txType = Number(tx.amount) < 0 ? 'expenses' : 'deposits';
                                            setLocation(`/${txType}/${tx.matchedTransactionId}`);
                                          }}
                                          data-testid={`button-view-${tx.id}`}
                                        >
                                          View
                                        </Button>
                                      )}
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => undoCategorizationMutation.mutate(tx.id)}
                                        disabled={undoCategorizationMutation.isPending}
                                        data-testid={`button-undo-${tx.id}`}
                                      >
                                        Undo
                                      </Button>
                                    </>
                                  )}
                                  {activeTab === 'deleted' && (
                                    <span className="text-sm text-gray-500">-</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pagination Controls */}
                    <div className="mt-4 flex items-center justify-between sticky bottom-0 bg-white py-3 border-t -mx-6 px-6 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
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
          </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="reconciliation">
            <div className="space-y-6">
              {/* Reconciliation Header */}
              {!activeReconciliationId && (
                <Card>
                  <CardHeader>
                    <CardTitle>Reconcile Account</CardTitle>
                    <CardDescription>
                      Match your book transactions with your bank statement
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Account Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Account</label>
                        <Select value={reconcileAccountId?.toString() || ''} onValueChange={(value) => setReconcileAccountId(Number(value))}>
                          <SelectTrigger data-testid="select-reconcile-account">
                            <SelectValue placeholder="Select account to reconcile" />
                          </SelectTrigger>
                          <SelectContent>
                            {glAccounts
                              .filter(acc => ['bank', 'credit_card', 'current_assets'].includes(acc.type))
                              .map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>
                                  {acc.code} - {acc.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statement Ending Date</label>
                        <Input 
                          type="date" 
                          value={reconcileStatementDate}
                          onChange={(e) => setReconcileStatementDate(e.target.value)}
                          data-testid="input-statement-date"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Statement Ending Balance</label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          value={reconcileStatementBalance}
                          onChange={(e) => setReconcileStatementBalance(e.target.value)}
                          data-testid="input-statement-balance"
                        />
                      </div>
                    </div>

                    <Button 
                      className="w-full md:w-auto" 
                      onClick={handleStartReconciliation}
                      disabled={createReconciliationMutation.isPending}
                      data-testid="button-start-reconciliation"
                    >
                      {createReconciliationMutation.isPending ? 'Starting...' : 'Start Reconciliation'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Reconciliation Summary */}
              {activeReconciliationId && activeReconciliation && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Reconciliation Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reconciliationLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading...</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Statement Balance</p>
                            <p className="text-xl font-semibold">${formatCurrencyUtil(activeReconciliation.statementEndingBalance)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Cleared Balance</p>
                            <p className="text-xl font-semibold">${formatCurrencyUtil(activeReconciliation.clearedBalance || 0)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Difference</p>
                            <p className={`text-xl font-semibold ${activeReconciliation.difference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ${formatCurrencyUtil(activeReconciliation.difference || 0)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge variant={activeReconciliation.status === 'completed' ? 'default' : 'secondary'}>
                              {activeReconciliation.status === 'in_progress' ? 'In Progress' : activeReconciliation.status}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Transactions to Reconcile */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Transactions</CardTitle>
                      <CardDescription>
                        Check off transactions that appear on your bank statement
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {ledgerEntriesLoading ? (
                        <div className="text-center py-12 text-gray-500">Loading transactions...</div>
                      ) : reconciliationLedgerEntries.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <p>No transactions found for this reconciliation period</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Cleared</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Debit</TableHead>
                                <TableHead className="text-right">Credit</TableHead>
                                <TableHead className="text-right">Balance</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reconciliationLedgerEntries.map((entry: any, index: number) => {
                                const runningBalance = reconciliationLedgerEntries
                                  .slice(0, index + 1)
                                  .reduce((sum: number, e: any) => sum + (e.debit || 0) - (e.credit || 0), 0);
                                
                                return (
                                  <TableRow key={entry.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={clearedEntries.has(entry.id)}
                                        onCheckedChange={(checked) => handleToggleCleared(entry.id, checked as boolean)}
                                        data-testid={`checkbox-entry-${entry.id}`}
                                      />
                                    </TableCell>
                                    <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="capitalize">{entry.transactionType?.replace('_', ' ')}</TableCell>
                                    <TableCell>{entry.reference || '-'}</TableCell>
                                    <TableCell>{entry.description || '-'}</TableCell>
                                    <TableCell className="text-right">
                                      {entry.debit ? `$${formatCurrencyUtil(entry.debit)}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {entry.credit ? `$${formatCurrencyUtil(entry.credit)}` : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      ${formatCurrencyUtil(runningBalance)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {reconciliationLedgerEntries.length > 0 && (
                        <div className="mt-6 flex gap-3 justify-end">
                          <Button
                            variant="outline"
                            onClick={handleCancelReconciliation}
                            data-testid="button-cancel-reconciliation"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: "Saved",
                                description: "Your reconciliation progress has been saved",
                              });
                            }}
                            data-testid="button-save-reconciliation"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => completeReconciliationMutation.mutate(activeReconciliationId)}
                            disabled={activeReconciliation?.difference !== 0 || completeReconciliationMutation.isPending}
                            data-testid="button-complete-reconciliation"
                          >
                            {completeReconciliationMutation.isPending ? 'Completing...' : 'Complete'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bank Feed Setup Dialog */}
      <BankFeedSetupDialog 
        open={showBankFeedSetup} 
        onOpenChange={setShowBankFeedSetup}
      />

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountCreated={(accountId) => {
          // Auto-select the newly created account for the current transaction
          if (currentTransactionId !== null) {
            handleAccountChange(currentTransactionId, accountId);
          }
          setCurrentTransactionId(null);
        }}
      />

      {/* Attachment Dialog */}
      {selectedAttachmentTransactionId && (
        <AttachmentDialog
          open={attachmentDialogOpen}
          onOpenChange={setAttachmentDialogOpen}
          transactionId={selectedAttachmentTransactionId}
        />
      )}

      {/* Categorization Dialog */}
      <CategorizeTransactionDialog
        open={categorizationDialogOpen}
        onOpenChange={setCategorizationDialogOpen}
        transaction={selectedTransaction}
      />
    </div>
    </TooltipProvider>
  );
}
