import { useState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Filter transactions by selected account
  const filteredTransactions = selectedAccountId 
    ? importedTransactions.filter(tx => tx.accountId === selectedAccountId)
    : importedTransactions;

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
                    <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                      <SelectTrigger className="w-24" data-testid="select-page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <div className="max-h-[500px] overflow-y-auto">
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
                          {paginatedTransactions.map((tx) => (
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
