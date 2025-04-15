import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BookOpen, ChevronDown, ChevronRight, Search, Book } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
                      <TableHead>Name</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries && ledgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                          No entries found in the general ledger
                        </TableCell>
                      </TableRow>
                    ) : (
                      // Group entries by transaction ID and sort by date
                      ledgerEntries && 
                      Array.from(new Set(ledgerEntries.map(entry => entry.transactionId)))
                        .map(transactionId => {
                          const entriesForTransaction = ledgerEntries
                            .filter(entry => entry.transactionId === transactionId)
                            .sort((a, b) => {
                              // Sort by account type and code
                              const accountA = accountBooks.find(acc => acc.id === a.accountId);
                              const accountB = accountBooks.find(acc => acc.id === b.accountId);
                              if (!accountA || !accountB) return 0;
                              return accountA.code.localeCompare(accountB.code);
                            });

                          // Get the date and transaction details from the first entry
                          const date = entriesForTransaction.length > 0 ? entriesForTransaction[0].date : new Date();
                          const transaction = transactions?.find(t => t.id === transactionId);
                          // Find contact name if available
                          const contactId = transaction?.contactId;
                          let contactName = "System Entry";
                          
                          if (contactId && contacts) {
                            const contact = contacts.find(c => c.id === contactId);
                            if (contact) {
                              contactName = contact.name;
                            }
                          }

                          // Return the entries for display
                          return entriesForTransaction.map((entry, index) => {
                            const account = accountBooks.find(acc => acc.id === entry.accountId);
                            return (
                              <TableRow 
                                key={entry.id}
                                className={index > 0 && index < entriesForTransaction.length ? "border-t-0" : ""}
                              >
                                {/* Only show date for the first row of the transaction */}
                                <TableCell>
                                  {index === 0 ? format(new Date(date), 'dd-MMM-yy') : ''}
                                </TableCell>
                                <TableCell>
                                  {index === 0 ? transaction?.reference || '' : ''}
                                </TableCell>
                                <TableCell>
                                  {index === 0 ? contactName : ''}
                                </TableCell>
                                <TableCell>{account?.name || 'Unknown Account'}</TableCell>
                                <TableCell>{entry.description || ''}</TableCell>
                                <TableCell className="text-right">
                                  {entry.debit > 0 ? entry.debit.toFixed(2) : ''}
                                </TableCell>
                                <TableCell className="text-right">
                                  {entry.credit > 0 ? entry.credit.toFixed(2) : ''}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        }).flat()
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}