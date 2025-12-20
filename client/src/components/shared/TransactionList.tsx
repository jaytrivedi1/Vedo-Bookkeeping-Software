import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Transaction, LedgerEntry } from "@shared/schema";
import { format } from "date-fns";
import {
  Eye,
  Trash2,
  AlertTriangle,
  FileText,
  DollarSign,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Plus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currencyUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface TransactionListProps {
  contactId: number;
  contactType: 'customer' | 'vendor';
  homeCurrency: string;
  onCreateNew?: () => void;
  maxHeight?: string;
}

export default function TransactionList({
  contactId,
  contactType,
  homeCurrency,
  onCreateNew,
  maxHeight = "600px"
}: TransactionListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedTransactionToDelete, setSelectedTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch ledger entries for selected transaction
  const { data: ledgerEntries, refetch: refetchLedgerEntries } = useQuery<LedgerEntry[]>({
    queryKey: ['/api/ledger-entries', selectedTransaction?.id],
    enabled: !!selectedTransaction,
    select: (data) => data.filter(entry => entry.transactionId === selectedTransaction?.id),
  });

  // Fetch accounts for ledger entry display
  const { data: accounts } = useQuery<any[]>({
    queryKey: ['/api/accounts'],
  });

  // Filter transactions for this contact
  const contactTransactions = transactions
    ? transactions.filter(transaction => transaction.contactId === contactId)
    : [];

  // Filter transactions based on contact type
  const filteredTransactions = contactType === 'customer'
    ? contactTransactions.filter(transaction =>
        transaction.type === 'invoice' ||
        transaction.type === 'payment' ||
        transaction.type === 'deposit' ||
        transaction.type === 'cheque' ||
        transaction.type === 'sales_receipt' ||
        transaction.type === 'transfer')
    : contactTransactions.filter(transaction =>
        transaction.type === 'bill' ||
        transaction.type === 'expense' ||
        transaction.type === 'payment' ||
        transaction.type === 'cheque' ||
        transaction.type === 'transfer');

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const endpoint = selectedTransactionToDelete?.type === 'payment'
        ? `/api/payments/${transactionId}/delete`
        : `/api/transactions/${transactionId}`;
      return apiRequest(endpoint, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      setSelectedTransactionToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
    }
  });

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransactionToDelete(transaction);
  };

  const confirmDeleteTransaction = () => {
    if (!selectedTransactionToDelete) return;
    setIsDeleting(true);
    deleteTransactionMutation.mutate(selectedTransactionToDelete.id);
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>;
      case 'open':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Open</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Cancelled</Badge>;
      case 'unapplied_credit':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Credit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get icon for transaction type
  const getTransactionIcon = (type: string, status?: string) => {
    switch (type) {
      case 'invoice':
      case 'bill':
        return <FileText className="h-5 w-5" />;
      case 'payment':
        return <DollarSign className="h-5 w-5" />;
      case 'deposit':
        return <ArrowDownCircle className="h-5 w-5" />;
      case 'sales_receipt':
        return <Receipt className="h-5 w-5" />;
      case 'transfer':
        return <ArrowUpCircle className="h-5 w-5" />;
      case 'expense':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  // Get icon color
  const getIconColor = (type: string) => {
    switch (type) {
      case 'invoice':
      case 'bill':
        return 'text-blue-600 bg-blue-50';
      case 'payment':
      case 'deposit':
      case 'sales_receipt':
        return 'text-emerald-600 bg-emerald-50';
      case 'expense':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  // Format transaction type for display
  const formatTransactionType = (type: string, status?: string) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'bill': return 'Bill';
      case 'payment': return 'Payment';
      case 'deposit': return status === 'unapplied_credit' ? 'Credit' : 'Deposit';
      case 'sales_receipt': return 'Sales Receipt';
      case 'transfer': return 'Transfer';
      case 'expense': return 'Expense';
      case 'cheque': return 'Cheque';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get view link for transaction
  const getTransactionLink = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'invoice': return `/invoices/${transaction.id}`;
      case 'bill': return `/bills/${transaction.id}`;
      case 'payment': return `/payments/${transaction.id}`;
      case 'deposit': return `/deposits/${transaction.id}`;
      case 'expense': return `/expenses/${transaction.id}`;
      case 'cheque': return `/cheques/${transaction.id}`;
      case 'sales_receipt': return `/sales-receipts/${transaction.id}`;
      case 'transfer': return `/transfers/${transaction.id}`;
      default: return null;
    }
  };

  // Group transactions by month
  const groupedTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((acc, transaction) => {
      const monthKey = format(new Date(transaction.date), "MMMM yyyy");
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

  const createButtonLabel = contactType === 'customer' ? 'New Invoice' : 'New Bill';

  return (
    <>
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">
              Transaction History
            </CardTitle>
            {onCreateNew && (
              <Button
                onClick={onCreateNew}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                {createButtonLabel}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {transactionsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-medium text-slate-600">No transactions yet</h3>
              <p className="mt-1 text-sm text-slate-400">
                {contactType === 'customer'
                  ? 'Create an invoice to get started.'
                  : 'Create a bill to get started.'}
              </p>
              {onCreateNew && (
                <Button
                  onClick={onCreateNew}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {createButtonLabel}
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea style={{ maxHeight }} className="pr-4">
              <div className="space-y-6">
                {Object.entries(groupedTransactions).map(([monthKey, monthTransactions]) => (
                  <div key={monthKey}>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      {monthKey}
                    </h4>
                    <div className="space-y-2">
                      {monthTransactions.map((transaction) => {
                        const link = getTransactionLink(transaction);
                        const iconColor = getIconColor(transaction.type);
                        const showBalance = transaction.type === 'invoice' || transaction.type === 'bill';

                        // Determine status badge
                        const statusBadge = transaction.type === 'deposit'
                          ? transaction.status === 'unapplied_credit'
                            ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Credit</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Completed</Badge>
                          : (transaction.type === 'invoice' || transaction.type === 'bill') &&
                            (transaction.balance === 0 || transaction.status === 'paid' || transaction.status === 'completed')
                            ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>
                          : (transaction.type === 'invoice' || transaction.type === 'bill') &&
                            transaction.balance !== null &&
                            transaction.balance !== undefined &&
                            transaction.balance > 0
                              ? <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Open</Badge>
                              : getStatusBadge(transaction.status);

                        return (
                          <div
                            key={transaction.id}
                            className="group relative bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center`}>
                                {getTransactionIcon(transaction.type, transaction.status)}
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-slate-800">
                                        {formatTransactionType(transaction.type, transaction.status)}
                                      </h4>
                                      {statusBadge}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                      <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                      {transaction.reference && (
                                        <>
                                          <span className="text-slate-300">•</span>
                                          <span className="font-medium">#{transaction.reference}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {/* Amount */}
                                  <div className="text-right">
                                    <div className={`text-lg font-semibold ${
                                      transaction.type === 'payment' ||
                                      transaction.type === 'deposit' ||
                                      transaction.type === 'sales_receipt'
                                        ? 'text-emerald-600'
                                        : transaction.type === 'expense'
                                          ? 'text-red-600'
                                          : 'text-slate-800'
                                    }`}>
                                      {formatCurrency(Math.abs(transaction.amount), transaction.currency, homeCurrency)}
                                    </div>
                                    {showBalance && transaction.balance !== null && transaction.balance !== undefined && (
                                      <div className="text-sm text-slate-500 mt-0.5">
                                        Balance: {formatCurrency(Math.abs(transaction.balance), transaction.currency, homeCurrency)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions - visible on hover */}
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {link ? (
                                <Link href={link} onClick={(e) => e.stopPropagation()}>
                                  <Button variant="outline" size="sm" className="h-8 px-3">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </Link>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransaction(transaction);
                                    if (transaction.id) {
                                      refetchLedgerEntries();
                                    }
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-red-600 hover:text-red-800 hover:bg-red-50 hover:border-red-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTransaction(transaction);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {formatTransactionType(selectedTransaction?.type || '', selectedTransaction?.status)}
              {selectedTransaction?.reference ? ` #${selectedTransaction.reference}` : ''}
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Date</h3>
                        <p className="text-base font-medium">
                          {format(new Date(selectedTransaction.date), "MMMM dd, yyyy")}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Status</h3>
                        <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                      </div>

                      {selectedTransaction.description && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-500">Description</h3>
                          <p className="text-base">{selectedTransaction.description}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Reference</h3>
                        <p className="text-base font-medium">{selectedTransaction.reference || 'N/A'}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Amount</h3>
                        <p className="text-base font-semibold text-emerald-700">
                          {formatCurrency(Math.abs(selectedTransaction.amount), selectedTransaction.currency, homeCurrency)}
                        </p>
                      </div>

                      {(selectedTransaction.type === 'invoice' || selectedTransaction.type === 'bill') && (
                        <div>
                          <h3 className="text-sm font-medium text-slate-500">Balance Due</h3>
                          <p className="text-base font-semibold text-blue-700">
                            {formatCurrency(typeof selectedTransaction.balance === 'number' ? Math.abs(selectedTransaction.balance) : 0, selectedTransaction.currency, homeCurrency)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Journal Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {!ledgerEntries ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                    </div>
                  ) : ledgerEntries.length === 0 ? (
                    <p className="text-slate-500 text-sm">No ledger entries found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgerEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {accounts?.find(a => a.id === entry.accountId)?.name || `Account #${entry.accountId}`}
                            </TableCell>
                            <TableCell>{entry.description}</TableCell>
                            <TableCell className="text-right">
                              {entry.debit > 0 ? formatCurrency(entry.debit, homeCurrency, homeCurrency) : ''}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.credit > 0 ? formatCurrency(entry.credit, homeCurrency, homeCurrency) : ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedTransaction(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog
        open={!!selectedTransactionToDelete}
        onOpenChange={(open) => !open && setSelectedTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Delete Transaction
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {formatTransactionType(selectedTransactionToDelete?.type || '').toLowerCase()}
              {selectedTransactionToDelete?.reference ? ` #${selectedTransactionToDelete.reference}` : ''}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteTransaction();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
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
