import { Link } from "wouter";
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
import { Trash2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Transaction, Contact } from "@shared/schema";

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
  onDeleteSuccess?: () => void;
}

export default function TransactionTable({ transactions, loading = false, onDeleteSuccess }: TransactionTableProps) {
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  
  // Fetch contacts to display their names instead of just IDs
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Function to get contact name by ID
  const getContactName = (contactId: number | null): string => {
    if (!contactId) return 'No client';
    if (!contacts) return `ID: ${contactId}`;
    
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : `ID: ${contactId}`;
  };
  
  const handleDelete = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleteLoading(true);
    try {
      await apiRequest(
        `/api/transactions/${transactionToDelete.id}`, 
        'DELETE'
      );
      
      // Clear the transaction to delete
      setTransactionToDelete(null);
      
      // Trigger refresh
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      // You could add toast notification here
    } finally {
      setIsDeleteLoading(false);
    }
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
        return 'bg-green-100 text-green-800';
      case 'expense':
        return 'bg-red-100 text-red-800';
      case 'journal_entry':
        return 'bg-blue-100 text-blue-800';
      case 'deposit':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatType = (type: string) => {
    if (type === 'journal_entry') return 'Journal Entry';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="overflow-x-auto">
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <p>Loading transactions...</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm text-gray-500">
                      {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {transaction.reference}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium text-gray-900">
                        {getContactName(transaction.contactId)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-gray-900">
                      {transaction.type === 'expense' 
                        ? '-$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaction.amount) 
                        : '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(transaction.type)}`}>
                        {formatType(transaction.type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium flex gap-3 justify-end">
                      <Link 
                        href={`/${transaction.type === 'journal_entry' ? 'journals' : transaction.type + 's'}/${transaction.id}`} 
                        className="text-primary hover:text-primary/90"
                      >
                        View
                      </Link>
                      
                      {/* Edit button - only for invoices for now */}
                      {transaction.type === 'invoice' && (
                        <Link 
                          href={`/invoice-edit/${transaction.id}`}
                          className="text-blue-500 hover:text-blue-600"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </Link>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
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
        </>
      )}
    </div>
  );
}
