import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from "date-fns";
import { BookOpen, ChevronDown, ChevronRight, Search, Book, Filter, Calendar, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Account, LedgerEntry, Transaction, Contact } from "@shared/schema";

// Types for account books
interface AccountWithLedger extends Account {
  ledgerEntries: LedgerEntry[];
  balance: number;
}

interface LedgerEntryWithTransaction extends LedgerEntry {
  transaction: Transaction;
}

export default function AccountBooks() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [expandedAccounts, setExpandedAccounts] = useState<number[]>([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>("all");
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  
  // Period presets
  const [selectedPeriod, setSelectedPeriod] = useState<string>("current-month");
  
  // Fetch accounts with balances
  const { data: accountBalances, isLoading: accountsLoading } = useQuery<{account: Account, balance: number}[]>({
    queryKey: ['/api/reports/account-balances'],
  });
  
  // Fetch all ledger entries
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/ledger-entries'],
  });
  
  // Fetch all transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Fetch all contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Loading state
  const isLoading = accountsLoading || ledgerLoading || transactionsLoading || contactsLoading;
  
  // Process and combine data
  const accountBooks: AccountWithLedger[] = [];
  
  if (accountBalances && ledgerEntries && transactions) {
    // Group ledger entries by account
    const entriesByAccount = new Map<number, LedgerEntryWithTransaction[]>();
    
    // Associate transactions with ledger entries
    ledgerEntries.forEach(entry => {
      const transaction = transactions.find(t => t.id === entry.transactionId);
      if (transaction) {
        const entryWithTransaction: LedgerEntryWithTransaction = {
          ...entry,
          transaction
        };
        
        const entries = entriesByAccount.get(entry.accountId) || [];
        entries.push(entryWithTransaction);
        entriesByAccount.set(entry.accountId, entries);
      }
    });
    
    // Combine account balances with ledger entries
    accountBalances.forEach(({ account, balance }) => {
      accountBooks.push({
        ...account,
        balance,
        ledgerEntries: entriesByAccount.get(account.id) || []
      });
    });
  }
  
  // Filter accounts
  const filteredAccounts = accountBooks
    .filter(account => {
      // Apply account type filter
      if (accountTypeFilter !== "all" && account.type !== accountTypeFilter) {
        return false;
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          account.code.toLowerCase().includes(query) ||
          account.name.toLowerCase().includes(query) ||
          (account.currency && account.currency.toLowerCase().includes(query)) ||
          (account.salesTaxType && account.salesTaxType.toLowerCase().includes(query))
        );
      }
      
      return true;
    })
    .sort((a, b) => a.code.localeCompare(b.code)); // Sort by account code
  
  // Toggle account expansion
  const toggleAccount = (accountId: number) => {
    if (expandedAccounts.includes(accountId)) {
      setExpandedAccounts(expandedAccounts.filter(id => id !== accountId));
    } else {
      setExpandedAccounts([...expandedAccounts, accountId]);
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Handle period selection
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined;
    
    switch (period) {
      case "current-month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "previous-month":
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case "current-year":
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case "custom":
        // Keep the current custom range
        break;
      default:
        from = startOfMonth(now);
        to = endOfMonth(now);
    }
    
    if (period !== "custom") {
      setDateRange({ from, to });
    }
  };
  
  // Format transaction type for display
  const formatTransactionType = (type: string): string => {
    switch (type) {
      case "invoice":
        return "Invoice";
      case "expense":
        return "Expense";
      case "journal_entry":
        return "Journal Entry";
      case "deposit":
        return "Deposit";
      default:
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
    }
  };
  
  // Get URL for transaction based on its type
  const getTransactionUrl = (transaction: Transaction): string => {
    switch (transaction.type) {
      case "invoice":
        return `/invoices/${transaction.id}`;
      case "expense":
        return `/expenses/${transaction.id}`;
      case "journal_entry":
        return `/journals/${transaction.id}`;
      case "deposit":
        return `/deposits/${transaction.id}`;
      case "payment":
        return `/payments/${transaction.id}`;
      case "bill":
        return `/bills/${transaction.id}`;
      case "cheque":
        return `/cheques/${transaction.id}`;
      default:
        return "#";
    }
  };
  
  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      // Use the dedicated payment deletion endpoint for payments
      const endpoint = transactionToDelete?.type === 'payment' 
        ? `/api/payments/${transactionId}/delete`
        : `/api/transactions/${transactionId}`;
      return apiRequest(endpoint, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted",
      });
      // Invalidate multiple related queries to ensure all data is fresh
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
      
      setTransactionToDelete(null);
      setIsDeleting(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
      setIsDeleting(false);
    }
  });
  
  // Handle delete button click
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      setIsDeleting(true);
      deleteTransactionMutation.mutate(transactionToDelete.id);
    }
  };
  
  return (
    <>
      <div className="py-6">
        {/* Page header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-primary" />
            <h1 className="text-2xl font-semibold text-gray-900">Account Books</h1>
          </div>
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle>General Ledger</CardTitle>
                <CardDescription>
                  View the double-entry accounting records for all accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  The general ledger contains all financial transactions recorded in your accounts using double-entry accounting principles.
                  Each transaction affects at least two accounts - typically with equal debits and credits.
                </p>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Period Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                    <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current-month">Current Month</SelectItem>
                        <SelectItem value="previous-month">Previous Month</SelectItem>
                        <SelectItem value="current-year">Current Year</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Custom Date Range */}
                  {selectedPeriod === "custom" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                      <div className="flex items-center space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="justify-start text-left font-normal w-full"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange.from ? (
                                format(dateRange.from, 'MMM dd, yyyy')
                              ) : (
                                <span>Start date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.from}
                              onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <span>to</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="justify-start text-left font-normal w-full"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {dateRange.to ? (
                                format(dateRange.to, 'MMM dd, yyyy')
                              ) : (
                                <span>End date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={dateRange.to}
                              onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                  
                  {/* Transaction Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                    <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="invoice">Invoices</SelectItem>
                        <SelectItem value="expense">Expenses</SelectItem>
                        <SelectItem value="journal_entry">Journal Entries</SelectItem>
                        <SelectItem value="deposit">Deposits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Search Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <Input
                        className="pl-10"
                        placeholder="Search accounts, descriptions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* General Ledger View */}
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading general ledger...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!ledgerEntries || ledgerEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                            No entries found in the general ledger
                          </TableCell>
                        </TableRow>
                      ) : (
                        (() => {
                          // Get filtered transactions
                          const allTransactionIds = Array.from(new Set(ledgerEntries?.map(entry => entry.transactionId) || []));
                          
                          const filteredTransactionIds = allTransactionIds.filter(transactionId => {
                            const transaction = transactions?.find(t => t.id === transactionId);
                            if (!transaction) return false;
                            
                            // Apply transaction type filter
                            if (transactionTypeFilter !== 'all' && transaction.type !== transactionTypeFilter) {
                              return false;
                            }
                            
                            // Apply date range filter
                            if (dateRange.from && dateRange.to) {
                              const txDate = new Date(transaction.date);
                              return txDate >= dateRange.from && txDate <= dateRange.to;
                            }
                            
                            return true;
                          });
                          
                          if (filteredTransactionIds.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-6 text-gray-500">
                                  No entries found matching the selected filters
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          // Render entries for each filtered transaction
                          const rows: React.ReactNode[] = [];
                          
                          filteredTransactionIds.forEach(transactionId => {
                            const entriesForTransaction = ledgerEntries
                              ?.filter(entry => entry.transactionId === transactionId)
                              .sort((a, b) => {
                                // Sort by account code
                                const accountA = accountBooks.find(acc => acc.id === a.accountId);
                                const accountB = accountBooks.find(acc => acc.id === b.accountId);
                                if (!accountA || !accountB) return 0;
                                return accountA.code.localeCompare(accountB.code);
                              });
                            
                            // Skip if entriesForTransaction is undefined
                            if (!entriesForTransaction) return;
                            
                            // Get transaction details
                            const date = entriesForTransaction.length > 0 ? entriesForTransaction[0].date : new Date();
                            const transaction = transactions?.find(t => t.id === transactionId);
                            
                            // Get contact name
                            const contactId = transaction?.contactId;
                            let contactName = "System Entry";
                            
                            if (contactId && contacts) {
                              const contact = contacts.find(c => c.id === contactId);
                              if (contact) {
                                contactName = contact.name;
                              }
                            }
                            
                            // Create rows for each entry
                            entriesForTransaction.forEach((entry, index) => {
                              const account = accountBooks.find(acc => acc.id === entry.accountId);
                              
                              rows.push(
                                <TableRow 
                                  key={entry.id}
                                  className={index > 0 && index < entriesForTransaction.length ? "border-t-0" : ""}
                                >
                                  <TableCell>
                                    {index === 0 ? format(new Date(date), 'dd-MMM-yy') : ''}
                                  </TableCell>
                                  <TableCell>
                                    {index === 0 && transaction ? (
                                      <Link 
                                        href={getTransactionUrl(transaction)}
                                        className="text-primary hover:underline font-medium"
                                        data-testid={`link-transaction-${transaction.id}`}
                                      >
                                        {transaction.reference || ''}
                                      </Link>
                                    ) : ''}
                                  </TableCell>
                                  <TableCell>
                                    {index === 0 && transaction ? formatTransactionType(transaction.type) : ''}
                                  </TableCell>
                                  <TableCell>
                                    {index === 0 ? contactName : ''}
                                  </TableCell>
                                  <TableCell>{account?.name || 'Unknown Account'}</TableCell>
                                  <TableCell>{entry.description || ''}</TableCell>
                                  <TableCell className="text-right">
                                    {entry.debit > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.debit) : ''}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {entry.credit > 0 ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(entry.credit) : ''}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {index === 0 && transaction ? (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(transaction)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Delete transaction"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          });
                          
                          return rows;
                        })()
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Delete Transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this 
              {transactionToDelete?.type === 'invoice' 
                ? ' invoice' 
                : transactionToDelete?.type === 'payment'
                  ? ' payment' 
                  : transactionToDelete?.type === 'journal_entry'
                    ? ' journal entry'
                    : transactionToDelete?.type === 'deposit'
                      ? ' deposit'
                      : ' transaction'}
              {transactionToDelete?.reference 
                ? ` #${transactionToDelete.reference}` 
                : ''}? 
              This action cannot be undone and will remove all associated ledger entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}