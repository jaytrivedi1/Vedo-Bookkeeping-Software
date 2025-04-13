import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import TransactionTable from "@/components/dashboard/TransactionTable";
import TransactionForm from "@/components/transactions/TransactionForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Transaction, LedgerEntry } from "@shared/schema";

export default function Journals() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch all transactions
  const { data: transactions, isLoading: transactionsLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Fetch all ledger entries
  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/ledger-entries'],
    queryFn: async () => {
      // API endpoint not implemented in the starter code, would be:
      // return fetch('/api/ledger-entries', { credentials: 'include' }).then(res => res.json());
      
      // For now, return empty array until the endpoint is implemented
      return [];
    },
    enabled: false, // Disable this query until the endpoint is implemented
  });
  
  // Filter journal entries
  const journalEntries = transactions
    ? transactions
        .filter((transaction) => transaction.type === "journal_entry")
        .filter((entry) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            entry.reference.toLowerCase().includes(query) ||
            entry.description?.toLowerCase().includes(query)
          );
        })
    : [];
  
  // Get total amounts
  const totalDebits = journalEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  return (
    <div className="py-6">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Journal Entries</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          <TransactionForm onSuccess={refetch} />
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Journal Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{journalEntries.length}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Transaction Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">${totalDebits.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Debits and Credits are balanced</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search journal entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Journal Entries Table */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <TransactionTable 
              transactions={journalEntries} 
              loading={transactionsLoading} 
              onDeleteSuccess={() => refetch()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
