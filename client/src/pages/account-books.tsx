import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Account, LedgerEntry, Transaction } from "@shared/schema";

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
  
  // Loading state
  const isLoading = accountsLoading || ledgerLoading || transactionsLoading;
  
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
          account.description?.toLowerCase().includes(query)
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
  
  return (
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
            </CardContent>
          </Card>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            <Select
              value={accountTypeFilter}
              onValueChange={setAccountTypeFilter}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Account Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Accounts List with Collapsible Ledger Entries */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading account books...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                            No accounts found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAccounts.map((account) => (
                          <Collapsible 
                            key={account.id}
                            open={expandedAccounts.includes(account.id)}
                            onOpenChange={() => toggleAccount(account.id)}
                            className="w-full"
                          >
                            <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => toggleAccount(account.id)}>
                              <TableCell>
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                                    {expandedAccounts.includes(account.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </TableCell>
                              <TableCell className="font-medium">{account.code}</TableCell>
                              <TableCell>{account.name}</TableCell>
                              <TableCell className="capitalize">{account.type}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(account.balance)}
                              </TableCell>
                            </TableRow>
                            
                            <CollapsibleContent>
                              <TableRow>
                                <TableCell colSpan={5} className="p-0 border-t-0">
                                  <div className="bg-gray-50 p-4">
                                    <h4 className="text-sm font-medium mb-2">Ledger Entries</h4>
                                    
                                    {account.ledgerEntries.length === 0 ? (
                                      <p className="text-sm text-gray-500 italic py-2">No ledger entries found</p>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="text-xs">Date</TableHead>
                                            <TableHead className="text-xs">Reference</TableHead>
                                            <TableHead className="text-xs">Description</TableHead>
                                            <TableHead className="text-xs text-right">Debit</TableHead>
                                            <TableHead className="text-xs text-right">Credit</TableHead>
                                            <TableHead className="text-xs text-right">Balance</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {account.ledgerEntries.sort((a, b) => 
                                            new Date(a.date).getTime() - new Date(b.date).getTime()
                                          ).map((entry, index, entries) => {
                                            // Calculate running balance
                                            let runningBalance = 0;
                                            
                                            // For asset and expense accounts, debits increase the balance
                                            // For liability, equity, and revenue accounts, credits increase the balance
                                            const isDebitNormal = account.type === 'asset' || account.type === 'expense';
                                            
                                            // Calculate balance up to this entry
                                            for (let i = 0; i <= index; i++) {
                                              const e = entries[i];
                                              const change = isDebitNormal ? 
                                                (e.debit - e.credit) : 
                                                (e.credit - e.debit);
                                              runningBalance += change;
                                            }
                                            
                                            return (
                                              <TableRow key={entry.id}>
                                                <TableCell className="text-xs">
                                                  {format(new Date(entry.date), 'MMM dd, yyyy')}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  {transactions.find(t => t.id === entry.transactionId)?.reference || '-'}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                  {entry.description}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-right">
                                                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                                </TableCell>
                                                <TableCell className="text-xs text-right font-medium">
                                                  {formatCurrency(runningBalance)}
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          </Collapsible>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}