import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Printer, 
  FileDown, 
  ArrowRightLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { formatCurrency } from "@/lib/currencyUtils";
import { Account, Transaction } from "@shared/schema";

// Transaction response type
interface TransferResponse {
  transaction: Transaction;
  ledgerEntries: any[];
}

export default function TransferView() {
  const [, navigate] = useLocation();
  const { backUrl, backLabel, handleBack } = useBackNavigation('/transactions', 'Transactions');
  
  // Extract the transfer ID from the URL using wouter
  const [routeMatch, params] = useRoute("/transfers/:id");
  const transferId = params?.id ? parseInt(params.id) : null;
  
  // Fetch transfer data
  const { data, isLoading, error } = useQuery<TransferResponse>({
    queryKey: ['/api/transactions', transferId],
    queryFn: async () => {
      if (!transferId) return null;
      const response = await fetch(`/api/transactions/${transferId}`);
      if (!response.ok) throw new Error('Failed to fetch transfer');
      return response.json();
    },
    enabled: !!transferId
  });
  
  // Fetch accounts for account names
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({ 
    queryKey: ['/api/accounts'] 
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<{ homeCurrency?: string }>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Loading state
  if (isLoading || accountsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="loading-state">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="error-state">
        <div className="text-destructive">
          <p className="text-lg">Error loading transfer: {String(error)}</p>
          <Button className="mt-4" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {backLabel}
          </Button>
        </div>
      </div>
    );
  }
  
  // If the transaction is not a transfer, show error
  if (data?.transaction?.type !== 'transfer') {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="not-found-state">
        <h1 className="text-2xl font-bold mb-4">Transfer not found</h1>
        <p className="mb-4">The transfer you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {backLabel}
        </Button>
      </div>
    );
  }
  
  // Get relevant data for the UI
  const transfer = data.transaction;
  const ledgerEntries = data.ledgerEntries || [];
  
  // Find source and destination accounts from ledger entries
  const sourceEntry = ledgerEntries.find(entry => entry.credit > 0);
  const destinationEntry = ledgerEntries.find(entry => entry.debit > 0);
  
  const sourceAccount = accounts?.find(a => a.id === sourceEntry?.accountId);
  const destinationAccount = accounts?.find(a => a.id === destinationEntry?.accountId);
  
  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="transfer-view">
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
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Transfer header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-title">
                Transfer {transfer.reference || `#${transfer.id}`}
              </h1>
            </div>
            {transfer.description && (
              <p className="text-gray-600 mt-1" data-testid="text-description">
                {transfer.description}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(transfer.status)} data-testid="badge-status">
            {transfer.status.toUpperCase()}
          </Badge>
        </div>

        {/* Transfer Information */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">From Account</h3>
              <p className="text-lg font-medium" data-testid="text-from-account">
                {sourceAccount ? (
                  <>
                    {sourceAccount.name}
                    {sourceAccount.code && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({sourceAccount.code})
                      </span>
                    )}
                  </>
                ) : (
                  'Unknown Account'
                )}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">To Account</h3>
              <p className="text-lg font-medium" data-testid="text-to-account">
                {destinationAccount ? (
                  <>
                    {destinationAccount.name}
                    {destinationAccount.code && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({destinationAccount.code})
                      </span>
                    )}
                  </>
                ) : (
                  'Unknown Account'
                )}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Transfer Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Amount</h3>
              <p className="text-2xl font-bold text-primary" data-testid="text-amount">
                {formatCurrency(transfer.amount, transfer.currency, homeCurrency)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Date</h3>
              <p className="text-base font-medium" data-testid="text-date">
                {format(new Date(transfer.date), 'MMMM dd, yyyy')}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Reference</h3>
              <p className="text-base font-medium" data-testid="text-reference">
                {transfer.reference || `TRF-${transfer.id}`}
              </p>
            </div>
          </div>

          {/* Memo */}
          {transfer.memo && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Memo</h3>
                <p className="text-gray-700" data-testid="text-memo">
                  {transfer.memo}
                </p>
              </div>
            </>
          )}

          {/* Ledger Entries */}
          {ledgerEntries.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-lg font-semibold mb-4">Ledger Entries</h3>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="table-ledger-entries">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Account</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry, index) => {
                        const account = accounts?.find(a => a.id === entry.accountId);
                        return (
                          <tr key={index} className="border-b" data-testid={`row-ledger-entry-${index}`}>
                            <td className="px-4 py-3" data-testid={`text-entry-account-${index}`}>
                              {account?.name || 'Unknown Account'}
                              {account?.code && (
                                <span className="text-sm text-gray-500 ml-2">
                                  ({account.code})
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right" data-testid={`text-entry-debit-${index}`}>
                              {entry.debit > 0 ? formatCurrency(entry.debit, transfer.currency, homeCurrency) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right" data-testid={`text-entry-credit-${index}`}>
                              {entry.credit > 0 ? formatCurrency(entry.credit, transfer.currency, homeCurrency) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
