import { useState } from "react";
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
import { 
  Building2,
  RefreshCw,
  Trash2,
  AlertCircle,
  Link as LinkIcon,
  Upload,
  Plus,
  CheckCircle2
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

export default function Banking() {
  const { toast } = useToast();
  const [showBankFeedSetup, setShowBankFeedSetup] = useState(false);

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

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
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
                <div className="space-y-3">
                  {accountsWithFeedStatus.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Building2 className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{account.name}</h3>
                              <span className="text-sm text-gray-500">({account.code})</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-600">
                                Balance: {formatCurrency(account.balance)}
                              </p>
                              {account.feedType && (
                                <Badge variant={account.feedType === 'plaid' ? 'default' : 'secondary'}>
                                  {account.feedType === 'plaid' ? (
                                    <>
                                      <LinkIcon className="h-3 w-3 mr-1" />
                                      Plaid Connected
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3 mr-1" />
                                      CSV Imports
                                    </>
                                  )}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {account.bankAccount ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => syncTransactionsMutation.mutate(account.bankAccount!.id)}
                                disabled={syncTransactionsMutation.isPending}
                                data-testid={`button-sync-${account.id}`}
                              >
                                <RefreshCw className={`h-4 w-4 mr-2 ${syncTransactionsMutation.isPending ? 'animate-spin' : ''}`} />
                                Sync
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteBankAccountMutation.mutate(account.bankAccount!.id)}
                                disabled={deleteBankAccountMutation.isPending}
                                data-testid={`button-disconnect-${account.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBankFeedSetup(true)}
                              data-testid={`button-connect-${account.id}`}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {account.hasCSVImports ? 'Add Connection' : 'Connect'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {account.bankAccount && (
                        <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <span className="font-medium">Institution:</span> {account.bankAccount.name}
                            </div>
                            <div>
                              <span className="font-medium">Account:</span> ***{account.bankAccount.mask}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span> {account.bankAccount.type}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
                      <TableHead>Source</TableHead>
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
                          <Badge 
                            variant={tx.source === 'csv' ? 'secondary' : 'outline'}
                            data-testid={`badge-source-${tx.source}`}
                          >
                            {tx.source === 'csv' ? 'CSV Import' : 'Plaid'}
                          </Badge>
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

      {/* Bank Feed Setup Dialog */}
      <BankFeedSetupDialog 
        open={showBankFeedSetup} 
        onOpenChange={setShowBankFeedSetup}
      />
    </div>
  );
}
