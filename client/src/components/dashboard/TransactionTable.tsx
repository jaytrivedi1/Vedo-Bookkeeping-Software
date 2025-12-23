import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { Trash2, Printer, Mail, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transaction, Contact } from "@shared/schema";
import ExportMenu from "@/components/ExportMenu";
import {
  exportTransactionsToCSV,
  exportTransactionsToPDF,
  generateFilename
} from "@/lib/exportUtils";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";

interface Preferences {
  homeCurrency?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
}

export default function TransactionTable({ transactions, loading = false, onDeleteSuccess }: TransactionTableProps) {
  const [, navigate] = useLocation();
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleteLoading, setIsBulkDeleteLoading] = useState(false);

  // Fetch contacts to display their names instead of just IDs
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });

  const homeCurrency = preferences?.homeCurrency || 'CAD';

  // Create a contact lookup Map for O(1) access instead of O(n) .find()
  const contactMap = useMemo(() => {
    if (!contacts) return new Map<number, Contact>();
    return new Map(contacts.map(c => [c.id, c]));
  }, [contacts]);

  // Function to get contact name by ID - uses Map for O(1) lookup
  const getContactName = useCallback((contactId: number | null): string => {
    if (!contactId) return 'No client';
    if (!contactMap.size) return `ID: ${contactId}`;
    const contact = contactMap.get(contactId);
    return contact ? contact.name : `ID: ${contactId}`;
  }, [contactMap]);

  // Pre-compute contact data for all transactions to avoid repeated lookups during render
  const transactionContactData = useMemo(() => {
    return new Map(transactions.map(t => {
      const contact = contactMap.get(t.contactId || 0);
      return [t.id, {
        contact,
        contactName: getContactName(t.contactId),
        formattedContactName: formatContactName(
          contact ? contact.name : (t.contactId ? `ID: ${t.contactId}` : 'No client'),
          contact?.currency,
          homeCurrency
        ),
        isVendorPayment: t.type === 'payment' && contact?.type === 'vendor',
      }];
    }));
  }, [transactions, contactMap, getContactName, homeCurrency]);

  // Handle row click - navigate to view page
  const handleRowClick = (transaction: Transaction) => {
    const route = transaction.type === 'journal_entry'
      ? 'journals'
      : transaction.type === 'bill'
        ? 'bill-view'
        : transaction.type + 's';
    navigate(`/${route}/${transaction.id}`);
  };

  // Handle checkbox selection - memoized to prevent unnecessary re-renders
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(transactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [transactions]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  const isAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < transactions.length;

  const handleDelete = async () => {
    if (!transactionToDelete) return;

    setIsDeleteLoading(true);
    try {
      // Use the dedicated payment deletion endpoint for payments
      const endpoint = transactionToDelete.type === 'payment'
        ? `/api/payments/${transactionToDelete.id}/delete`
        : `/api/transactions/${transactionToDelete.id}`;

      await apiRequest(endpoint, 'DELETE');

      // Clear the transaction to delete
      setTransactionToDelete(null);

      // Trigger refresh
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    setIsBulkDeleteLoading(true);
    try {
      const deletePromises = Array.from(selectedIds).map(id => {
        const transaction = transactions.find(t => t.id === id);
        if (!transaction) return Promise.resolve();

        const endpoint = transaction.type === 'payment'
          ? `/api/payments/${id}/delete`
          : `/api/transactions/${id}`;

        return apiRequest(endpoint, 'DELETE');
      });

      await Promise.all(deletePromises);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);

      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Failed to delete transactions:', error);
    } finally {
      setIsBulkDeleteLoading(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Helper function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to get transaction type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'invoice':
        return 'bg-blue-100 text-blue-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'bill':
        return 'bg-orange-100 text-orange-800';
      case 'journal_entry':
        return 'bg-purple-100 text-purple-800';
      case 'deposit':
        return 'bg-emerald-100 text-emerald-800';
      case 'payment':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: string) => {
    if (type === 'journal_entry') return 'Journal';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    if (!contacts || !transactions.length) return;

    const filename = generateFilename('transactions', undefined);
    exportTransactionsToCSV(transactions, contacts, `${filename}.csv`);
  };

  // Handle export to PDF
  const handleExportPDF = () => {
    if (!contacts || !transactions.length) return;

    const filename = generateFilename('transactions', undefined);
    exportTransactionsToPDF(transactions, contacts, `${filename}.pdf`);
  };

  return (
    <div className="overflow-x-auto relative">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <p>Loading transactions...</p>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            {transactions.length > 0 && (
              <ExportMenu
                onExportCSV={handleExportCSV}
                onExportPDF={handleExportPDF}
                label="Export Transactions"
              />
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={isSomeSelected ? "data-[state=checked]:bg-slate-400" : ""}
                  />
                </TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="w-28">Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(transaction)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(transaction.id)}
                        onCheckedChange={(checked) => handleSelectOne(transaction.id, checked as boolean)}
                        aria-label={`Select transaction ${transaction.reference}`}
                      />
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                        {formatStatus(transaction.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                        {formatType(transaction.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {transaction.reference || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-slate-900">
                        {transactionContactData.get(transaction.id)?.formattedContactName || 'No client'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold text-slate-900">
                      {(() => {
                        const formattedAmount = formatCurrency(transaction.amount, transaction.currency, homeCurrency);
                        const contactData = transactionContactData.get(transaction.id);
                        // Vendor payments are negative (money going out)
                        if (contactData?.isVendorPayment) {
                          return '-' + formattedAmount;
                        }
                        // Expenses and deposits are negative (money going out)
                        if (transaction.type === 'expense' || transaction.type === 'deposit') {
                          return '-' + formattedAmount;
                        }
                        // Everything else is positive (bills, invoices, customer payments)
                        return formattedAmount;
                      })()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setTransactionToDelete(transaction)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this {transactionToDelete?.type.replace('_', ' ')} and all associated records.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                              disabled={isDeleteLoading}
                            >
                              {isDeleteLoading ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{transactions.length}</span> of <span className="font-medium">{transactions.length}</span> results
                </p>
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>
                      1
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>

          {/* Floating Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-slate-900 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
                <span className="text-sm font-medium">
                  {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
                <div className="h-5 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-slate-800 h-8 px-3"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-slate-800 h-8 px-3"
                    onClick={() => {
                      // Print functionality would go here
                      console.log('Batch print:', Array.from(selectedIds));
                    }}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-slate-800 h-8 px-3"
                    onClick={() => {
                      // Send reminders functionality would go here
                      console.log('Send reminders:', Array.from(selectedIds));
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                </div>
                <div className="h-5 w-px bg-slate-700" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
                  onClick={clearSelection}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Clear selection</span>
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected transactions and all associated records.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  disabled={isBulkDeleteLoading}
                >
                  {isBulkDeleteLoading ? 'Deleting...' : 'Delete All'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
