import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Transaction, LedgerEntry } from "@shared/schema";
import { format } from "date-fns";
import {
  Eye,
  Trash2,
  AlertTriangle,
  FileText,
  MoreHorizontal,
  Mail,
  Download
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [, navigate] = useLocation();
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

  // Get compact status badge
  const getStatusBadge = (transaction: Transaction) => {
    const { type, status, balance } = transaction;

    // For invoices/bills, check balance to determine status
    if (type === 'invoice' || type === 'bill') {
      if (balance === 0 || status === 'paid' || status === 'completed') {
        return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-emerald-100 text-emerald-700 font-medium">Paid</Badge>;
      }
      if (status === 'overdue') {
        return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-red-100 text-red-700 font-medium">Overdue</Badge>;
      }
      return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-amber-100 text-amber-700 font-medium">Open</Badge>;
    }

    // For deposits
    if (type === 'deposit') {
      if (status === 'unapplied_credit') {
        return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-blue-100 text-blue-700 font-medium">Credit</Badge>;
      }
      return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-emerald-100 text-emerald-700 font-medium">Done</Badge>;
    }

    // For payments
    if (type === 'payment') {
      return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-emerald-100 text-emerald-700 font-medium">Rcvd</Badge>;
    }

    // Default
    return <Badge className="text-[10px] px-1.5 py-0 h-[18px] bg-slate-100 text-slate-600 font-medium">Done</Badge>;
  };

  // Format transaction type for display (short)
  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'invoice': return 'Invoice';
      case 'bill': return 'Bill';
      case 'payment': return 'Payment';
      case 'deposit': return 'Deposit';
      case 'sales_receipt': return 'Receipt';
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

  // Handle row click
  const handleRowClick = (transaction: Transaction) => {
    const link = getTransactionLink(transaction);
    if (link) {
      navigate(link);
    } else {
      setSelectedTransaction(transaction);
      refetchLedgerEntries();
    }
  };

  // Sort transactions by date (newest first) - no grouping
  const sortedTransactions = filteredTransactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Grid column definition for consistent alignment (no icon column)
  const gridCols = "grid-cols-[55px_105px_85px_1fr_100px_90px_36px]";

  return (
    <>
      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-0 px-4">
          <CardTitle className="text-base font-semibold text-slate-800">
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 px-0">
          {transactionsLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 px-4">
              <FileText className="mx-auto h-10 w-10 text-slate-300 mb-2" />
              <h3 className="text-sm font-medium text-slate-600">No transactions yet</h3>
              <p className="mt-1 text-xs text-slate-400">
                {contactType === 'customer'
                  ? 'Create an invoice to get started.'
                  : 'Create a bill to get started.'}
              </p>
            </div>
          ) : (
            <div>
              {/* Sticky Column Headers */}
              <div className={`grid ${gridCols} items-center h-9 px-4 pl-5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10`}>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Date</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Number</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Memo</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right">Amount</span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide text-right">Balance</span>
                <span></span>
              </div>

              {/* Transaction Rows */}
              <ScrollArea style={{ maxHeight }}>
                <div>
                  {sortedTransactions.map((transaction) => {
                    const hasBalance = (transaction.type === 'invoice' || transaction.type === 'bill') &&
                      transaction.balance !== null && transaction.balance !== undefined;

                    return (
                      <div
                        key={transaction.id}
                        onClick={() => handleRowClick(transaction)}
                        className={`group grid ${gridCols} items-center h-11 px-4 pl-5 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors`}
                      >
                        {/* Status Badge */}
                        <div>
                          {getStatusBadge(transaction)}
                        </div>

                        {/* Date */}
                        <span className="text-[13px] text-slate-600 tabular-nums">
                          {format(new Date(transaction.date), "MMM d, yyyy")}
                        </span>

                        {/* Number/Reference */}
                        <span className="text-[13px] font-mono text-slate-700 truncate">
                          {transaction.reference ? `#${transaction.reference}` : '—'}
                        </span>

                        {/* Memo/Description */}
                        <span className="text-[13px] text-slate-500 truncate pr-2">
                          {transaction.description || transaction.memo || formatTransactionType(transaction.type)}
                        </span>

                        {/* Amount */}
                        <div className={`text-[13px] font-semibold tabular-nums text-right ${
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

                        {/* Balance */}
                        <div className="text-[13px] tabular-nums text-right text-slate-500">
                          {hasBalance
                            ? formatCurrency(Math.abs(transaction.balance!), transaction.currency, homeCurrency)
                            : '—'
                          }
                        </div>

                        {/* Actions Menu */}
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(transaction);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {(transaction.type === 'invoice' || transaction.type === 'bill') && (
                                <>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/api/invoices/${transaction.id}/pdf`, '_blank');
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to invoice with send dialog open
                                      navigate(`/invoices/${transaction.id}?openSendDialog=true`);
                                    }}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTransaction(transaction);
                                }}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {formatTransactionType(selectedTransaction?.type || '')}
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
                        <div className="mt-1">{getStatusBadge(selectedTransaction)}</div>
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
