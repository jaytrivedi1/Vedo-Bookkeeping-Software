import { useState, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { usePlaidLink } from 'react-plaid-link';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2,
  CreditCard,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
  Download,
  Upload
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BankConnection, BankAccount, ImportedTransaction } from "@shared/schema";
import CSVUploadDialog from "@/components/csv-upload-dialog";

export default function Banking() {
  const { toast } = useToast();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);

  // Fetch bank connections
  const { data: connections = [], isLoading: connectionsLoading } = useQuery<BankConnection[]>({
    queryKey: ['/api/plaid/connections'],
  });

  // Fetch bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/plaid/accounts'],
  });

  // Fetch imported transactions
  const { data: importedTransactions = [], isLoading: transactionsLoading } = useQuery<ImportedTransaction[]>({
    queryKey: ['/api/plaid/imported-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/plaid/imported-transactions?status=unmatched');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });

  // Create link token mutation
  const createLinkTokenMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/plaid/link-token', 'POST');
    },
    onSuccess: (data) => {
      setLinkToken(data.link_token);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize bank connection",
        variant: "destructive",
      });
    },
  });

  // Exchange token mutation
  const exchangeTokenMutation = useMutation({
    mutationFn: async (public_token: string) => {
      return await apiRequest('/api/plaid/exchange-token', 'POST', { public_token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      toast({
        title: "Success",
        description: "Bank account connected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to connect bank account",
        variant: "destructive",
      });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/plaid/connections/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/connections'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      toast({
        title: "Success",
        description: "Bank connection removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove connection",
        variant: "destructive",
      });
    },
  });

  // Sync transactions mutation
  const syncTransactionsMutation = useMutation({
    mutationFn: async (accountId: number) => {
      return await apiRequest(`/api/plaid/sync-transactions/${accountId}`, 'POST');
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

  // Plaid Link configuration
  const onSuccess = useCallback((public_token: string) => {
    exchangeTokenMutation.mutate(public_token);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  // Start connection flow
  const handleConnectBank = () => {
    createLinkTokenMutation.mutate();
  };

  // Open Plaid Link when token is ready
  if (linkToken && ready && !exchangeTokenMutation.isPending) {
    open();
    setLinkToken(null);
  }

  const handleSyncTransactions = (accountId: number) => {
    syncTransactionsMutation.mutate(accountId);
  };

  const handleViewTransactions = (account: BankAccount) => {
    setSelectedAccount(account);
    setShowTransactions(true);
  };

  const getAccountIcon = (type: string) => {
    if (type === 'credit' || type === 'credit card') {
      return <CreditCard className="h-5 w-5 text-primary" />;
    }
    return <Building2 className="h-5 w-5 text-primary" />;
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Banking</h1>
            <p className="mt-1 text-sm text-gray-500">
              Connect your bank accounts and import transactions automatically
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowCSVUpload(true)}
              data-testid="button-upload-csv"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
            <Button
              onClick={handleConnectBank}
              disabled={createLinkTokenMutation.isPending}
              data-testid="button-connect-bank"
            >
              <LinkIcon className="mr-2 h-4 w-4" />
              {createLinkTokenMutation.isPending ? 'Loading...' : 'Connect Bank Account'}
            </Button>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Bank Accounts</CardTitle>
              <CardDescription>
                Manage your connected bank accounts and sync transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionsLoading || accountsLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : connections.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No accounts connected</AlertTitle>
                  <AlertDescription>
                    Connect your bank account to automatically import transactions. Click "Connect Bank Account" to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => {
                    const accountsForConnection = bankAccounts.filter(
                      (acc) => acc.connectionId === connection.id
                    );

                    return (
                      <div key={connection.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Building2 className="h-6 w-6 text-primary" />
                            <div>
                              <h3 className="font-semibold">{connection.institutionName}</h3>
                              <p className="text-sm text-gray-500">
                                Last synced: {connection.lastSync ? format(new Date(connection.lastSync), 'PPp') : 'Never'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={connection.status === 'active' ? 'default' : 'destructive'}>
                              {connection.status}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteConnectionMutation.mutate(connection.id!)}
                              disabled={deleteConnectionMutation.isPending}
                              data-testid={`button-delete-connection-${connection.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {accountsForConnection.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                              <div className="flex items-center gap-3">
                                {getAccountIcon(account.type)}
                                <div>
                                  <p className="font-medium">{account.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {account.type} {account.mask ? `••••${account.mask}` : ''}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">Balance</p>
                                  <p className="font-semibold">{formatCurrency(account.currentBalance)}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSyncTransactions(account.id!)}
                                  disabled={syncTransactionsMutation.isPending}
                                  data-testid={`button-sync-${account.id}`}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sync
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewTransactions(account)}
                                  data-testid={`button-view-transactions-${account.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unmatched Transactions */}
          {importedTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unmatched Transactions</CardTitle>
                <CardDescription>
                  {importedTransactions.length} transactions waiting to be categorized
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription>
                    You have imported transactions that need to be categorized. These will be available in the transaction matching interface soon.
                  </AlertDescription>
                </Alert>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importedTransactions.slice(0, 10).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>{format(new Date(tx.date), 'PP')}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{tx.name}</p>
                            {tx.merchantName && (
                              <p className="text-sm text-gray-500">{tx.merchantName}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {tx.category && tx.category.length > 0 ? (
                            <Badge variant="outline">{tx.category[0]}</Badge>
                          ) : (
                            <span className="text-gray-400">Uncategorized</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importedTransactions.length > 10 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing 10 of {importedTransactions.length} unmatched transactions
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Transaction Details Dialog */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedAccount?.name} Transactions
            </DialogTitle>
            <DialogDescription>
              Recent transactions from your bank account
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8 text-gray-500">
            Transaction details will be available in the next update
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog 
        open={showCSVUpload} 
        onOpenChange={setShowCSVUpload}
      />
    </div>
  );
}
