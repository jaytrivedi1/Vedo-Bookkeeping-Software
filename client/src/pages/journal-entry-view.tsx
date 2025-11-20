import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Printer, 
  FileDown, 
  Edit2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { formatCurrency } from "@/lib/currencyUtils";
import { Transaction, LedgerEntry, Contact, Account } from "@shared/schema";

interface LedgerEntryWithExtras extends LedgerEntry {
  accountName?: string;
  accountCode?: string;
  contactName?: string;
}

export default function JournalEntryView() {
  const [, navigate] = useLocation();
  const [journalId, setJournalId] = useState<number | null>(null);
  const { backUrl, backLabel, handleBack } = useBackNavigation('/journals', 'Journal Entries');
  
  // Extract the journal entry ID from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/journals\/(\d+)/);
    if (match && match[1]) {
      setJournalId(parseInt(match[1]));
    } else {
      handleBack();
    }
  }, [handleBack]);
  
  // Fetch journal entry details
  const { data: journalData, isLoading: journalLoading } = useQuery({
    queryKey: ['/api/transactions', journalId],
    queryFn: async () => {
      if (!journalId) return null;
      const response = await fetch(`/api/transactions/${journalId}`);
      if (!response.ok) throw new Error('Failed to fetch journal entry');
      return response.json();
    },
    enabled: !!journalId
  });
  
  // Fetch contacts for contact info
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch accounts for account names
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<{ homeCurrency?: string }>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Extract data once fetched
  const journalEntry: Transaction | undefined = journalData?.transaction;
  const ledgerEntries: LedgerEntry[] = journalData?.ledgerEntries || [];
  
  // Enhance ledger entries with account info
  // Note: contactId is not currently stored in ledger_entries table
  const enrichedEntries: LedgerEntryWithExtras[] = ledgerEntries.map(entry => {
    const account = accounts?.find(a => a.id === entry.accountId);
    
    return {
      ...entry,
      accountName: account?.name,
      accountCode: account?.code,
      contactName: undefined // Contact info not stored in ledger entries
    };
  });
  
  // Calculate totals
  const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0);
  
  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (journalLoading || contactsLoading || accountsLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!journalEntry) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4" data-testid="heading-not-found">Journal Entry not found</h1>
        <p className="mb-4">The journal entry you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack} data-testid="button-back-to-journals">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {backLabel}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {backLabel}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-print">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" data-testid="button-download">
            <FileDown className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Link href={`/journals/${journalEntry.id}/edit`}>
            <Button size="sm" data-testid="button-edit">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Journal Entry Details */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Journal entry header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-journal-reference">Journal Entry #{journalEntry.reference}</h1>
            <p className="text-gray-500" data-testid="text-journal-date">
              {journalEntry.date ? format(new Date(journalEntry.date), 'MMMM d, yyyy') : 'No date'}
            </p>
          </div>
          <Badge 
            className={`px-3 py-1 text-sm ${getStatusColor(journalEntry.status)}`}
            data-testid="badge-status"
          >
            {journalEntry.status.charAt(0).toUpperCase() + journalEntry.status.slice(1)}
          </Badge>
        </div>
        
        {/* Journal entry body */}
        <div className="px-6 py-4">
          {/* Journal entry details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left side - Journal info */}
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Journal Number:</span>
                  <span data-testid="text-journal-number">{journalEntry.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span data-testid="text-date">
                    {journalEntry.date ? format(new Date(journalEntry.date), 'PP') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span data-testid="text-status">{journalEntry.status.charAt(0).toUpperCase() + journalEntry.status.slice(1)}</span>
                </div>
              </div>
            </div>
            
            {/* Right side - Memo */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">MEMO</h3>
              <p className="text-gray-900" data-testid="text-memo">
                {journalEntry.description || 'No memo provided'}
              </p>
            </div>
          </div>
          
          {/* Entries Table */}
          <div className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-entries">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrichedEntries.map((entry, index) => (
                    <tr key={entry.id} data-testid={`row-entry-${entry.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900" data-testid={`text-account-${entry.id}`}>
                          {entry.accountCode ? `${entry.accountCode} - ${entry.accountName}` : entry.accountName || 'Unknown Account'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900" data-testid={`text-contact-${entry.id}`}>
                          {entry.contactName || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900" data-testid={`text-description-${entry.id}`}>
                          {entry.description || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900" data-testid={`text-debit-${entry.id}`}>
                          {entry.debit > 0 ? formatCurrency(entry.debit, journalEntry.currency, homeCurrency) : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="text-sm text-gray-900" data-testid={`text-credit-${entry.id}`}>
                          {entry.credit > 0 ? formatCurrency(entry.credit, journalEntry.currency, homeCurrency) : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900" data-testid="text-total-debits">
                        {formatCurrency(totalDebits, journalEntry.currency, homeCurrency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900" data-testid="text-total-credits">
                        {formatCurrency(totalCredits, journalEntry.currency, homeCurrency)}
                      </div>
                    </td>
                  </tr>
                  {/* Balance validation row */}
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-center">
                      {Math.abs(totalDebits - totalCredits) < 0.01 ? (
                        <span className="text-sm text-green-600 font-medium" data-testid="text-balance-status">
                          ✓ Debits and Credits are balanced
                        </span>
                      ) : (
                        <span className="text-sm text-red-600 font-medium" data-testid="text-balance-status">
                          ⚠ Out of balance by {formatCurrency(Math.abs(totalDebits - totalCredits), journalEntry.currency, homeCurrency)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Attachments section if any */}
          {journalEntry.attachments && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-medium text-gray-500 mb-2">ATTACHMENTS</h3>
              <p className="text-sm text-gray-900" data-testid="text-attachments">
                {journalEntry.attachments}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
