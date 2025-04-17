import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Contact, Transaction, LedgerEntry } from "@shared/schema";
import { format } from "date-fns";
import { Search, User, ChevronRight, X, Eye, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface CustomerListProps {
  className?: string;
}

export default function CustomerList({ className }: CustomerListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedTransactionToDelete, setSelectedTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Fetch customers
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
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
  
  const handleCustomerClick = (customer: Contact) => {
    setSelectedCustomer(customer);
    setSidebarOpen(true);
  };
  
  // Filter customers by search query
  const filteredCustomers = contacts
    ? contacts
        .filter(contact => 
          contact.type === 'customer' || contact.type === 'both'
        )
        .filter(customer => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            customer.name.toLowerCase().includes(query) ||
            (customer.email ? customer.email.toLowerCase().includes(query) : false) ||
            (customer.contactName ? customer.contactName.toLowerCase().includes(query) : false) ||
            (customer.phone ? customer.phone.toLowerCase().includes(query) : false)
          );
        })
    : [];
    
  // Filter transactions for selected customer
  const customerTransactions = transactions && selectedCustomer
    ? transactions.filter(transaction => transaction.contactId === selectedCustomer.id)
    : [];
    
  // Filter transactions for the Invoices tab (invoices + payments + deposits)
  const customerInvoicesAndPayments = customerTransactions
    ? customerTransactions.filter(transaction => 
        transaction.type === 'invoice' || 
        transaction.type === 'payment' ||
        transaction.type === 'deposit')
    : [];
    
  // Filter just invoices (for calculations and counts)
  const customerInvoices = customerTransactions
    ? customerTransactions.filter(transaction => transaction.type === 'invoice')
    : [];
    
  // Filter expenses
  const customerExpenses = customerTransactions
    ? customerTransactions.filter(transaction => transaction.type === 'expense')
    : [];
    
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Delete customer and transaction mutations
  
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      return apiRequest(`/api/contacts/${customerId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Customer deleted",
        description: "Customer has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      setSidebarOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  });
  
  const deleteTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      return apiRequest(`/api/transactions/${transactionId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted",
      });
      // Invalidate multiple related queries to ensure all data is fresh
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
      
      // Force a reload of the page to ensure all components are updated with the latest data
      window.location.reload();
      
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

  const handleDeleteCustomer = () => {
    if (!selectedCustomer) return;
    
    // Check if customer has outstanding transactions
    const hasTransactions = customerTransactions && customerTransactions.length > 0;
    
    if (hasTransactions) {
      toast({
        title: "Cannot delete customer",
        description: "This customer has associated transactions. Delete all transactions first.",
        variant: "destructive",
      });
      setIsDeleteDialogOpen(false);
      return;
    }
    
    setIsDeleting(true);
    deleteCustomerMutation.mutate(selectedCustomer.id);
  };
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            View and manage all your customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search customers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Customers list */}
          <ScrollArea className="h-[400px]">
            {contactsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <User className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No customers found</h3>
                <p className="mt-1 text-sm">Get started by adding a new customer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 rounded-md border hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <div>
                      <h3 className="font-medium">{customer.name}</h3>
                      {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
                      {customer.phone && (
                        <p className="text-sm text-gray-500">{customer.phone}</p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Customer details sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <SheetTitle className="text-xl">Customer Details</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          
          {selectedCustomer && (
            <ScrollArea className="h-[calc(100vh-80px)]">
              <div>
                <div className="p-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedCustomer.name}</h2>
                    {selectedCustomer.contactName && (
                      <p className="text-gray-600 mb-1">Contact: {selectedCustomer.contactName}</p>
                    )}
                    {selectedCustomer.email && <p className="text-gray-600 mb-1">Email: {selectedCustomer.email}</p>}
                    {selectedCustomer.phone && (
                      <p className="text-gray-600 mb-1">Phone: {selectedCustomer.phone}</p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-gray-600 mb-4">{selectedCustomer.address}</p>
                    )}
                  </div>
                </div>
                
                <div className="px-6">
                  <h3 className="text-lg font-medium my-4">
                    Transactions ({customerInvoicesAndPayments.length})
                  </h3>
                  
                  <div className="mt-2">
                    {customerInvoicesAndPayments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No transactions found for this customer.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerInvoicesAndPayments
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((transaction) => {
                              // Format transaction type for display
                              const typeDisplay = transaction.type === 'invoice' 
                                ? 'Invoice'
                                : transaction.type === 'payment'
                                  ? 'Payment'
                                  : transaction.type === 'deposit'
                                    ? 'Deposit'
                                    : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                              
                              // Only show balance for invoices, not for payments or deposits
                              const showBalance = transaction.type === 'invoice';
                              
                              // For deposits, check actual status
                              const isUnappliedCredit = transaction.type === 'deposit' && 
                                transaction.status === 'unapplied_credit';
                              
                              // For invoices, show "Open" badge if there's a balance
                              // For deposits, respect their status (unapplied_credit or completed)
                              const statusBadge = transaction.type === 'deposit'
                                ? transaction.status === 'unapplied_credit'
                                  ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Unapplied Credit</Badge>
                                  : <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>
                                : transaction.type === 'invoice' && 
                                  transaction.balance !== null && 
                                  transaction.balance !== undefined &&
                                  transaction.balance > 0 && 
                                  transaction.status !== 'draft'
                                    ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Open</Badge>
                                    : getStatusBadge(transaction.status);
                                
                              return (
                                <TableRow key={transaction.id}>
                                  <TableCell>
                                    {format(new Date(transaction.date), "MMM dd, yyyy")}
                                  </TableCell>
                                  <TableCell>{typeDisplay}</TableCell>
                                  <TableCell>{transaction.reference}</TableCell>
                                  <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                                  <TableCell>
                                    {showBalance && transaction.balance !== null 
                                      ? formatCurrency(transaction.balance) 
                                      : '—'}
                                  </TableCell>
                                  <TableCell>{statusBadge}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {transaction.type === 'invoice' ? (
                                        <Link href={`/invoices/${transaction.id}`} onClick={(e) => e.stopPropagation()}>
                                          <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                          </Button>
                                        </Link>
                                      ) : transaction.type === 'payment' ? (
                                        <Link href={`/payments/${transaction.id}`} onClick={(e) => e.stopPropagation()}>
                                          <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4 mr-1" />
                                            View
                                          </Button>
                                        </Link>
                                      ) : (
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
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
                                        variant="ghost" 
                                        size="sm"
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTransaction(transaction);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-1" />
                                        Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
                
                {/* Summary */}
                <div className="border-t mt-6 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Total Invoiced</h3>
                      <p className="text-xl font-semibold">
                        {formatCurrency(customerInvoices.reduce((sum, i) => sum + i.amount, 0))}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Outstanding Balance</h3>
                      <p className="text-xl font-semibold text-blue-700">
                        {formatCurrency(customerInvoices.reduce((sum, i) => {
                          // Add balance to the sum if it exists, otherwise add the full amount
                          // This assumes invoices with no balance set are fully outstanding
                          const outstandingAmount = (i.balance !== null && i.balance !== undefined) 
                            ? i.balance 
                            : i.amount;
                          return sum + outstandingAmount;
                        }, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center">
              {selectedTransaction?.type === 'invoice' ? 'Invoice' : 
               selectedTransaction?.type === 'payment' ? 'Payment' :
               selectedTransaction?.type === 'deposit' ? 'Deposit (Unapplied Credit)' :
               selectedTransaction?.type?.charAt(0).toUpperCase() + selectedTransaction?.type?.slice(1) || 'Transaction'} 
              {selectedTransaction?.reference ? ` #${selectedTransaction.reference}` : ''}
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Main transaction information in a card */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTransaction.type === 'invoice' ? 'Invoice Details' : 
                     selectedTransaction.type === 'payment' ? 'Payment Details' : 
                     selectedTransaction.type === 'deposit' ? 'Deposit Details (Unapplied Credit)' : 
                     'Transaction Details'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left column */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Date</h3>
                        <p className="text-base font-medium">
                          {format(new Date(selectedTransaction.date), "MMMM dd, yyyy")}
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Status</h3>
                        <div className="mt-1">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            selectedTransaction.status === 'paid' || selectedTransaction.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : selectedTransaction.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : selectedTransaction.status === 'overdue'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedTransaction.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      {selectedTransaction.description && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Description</h3>
                          <p className="text-base">{selectedTransaction.description}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Right column */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                        <p className="text-base font-medium">{selectedTransaction.reference || 'N/A'}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium text-gray-500">Amount</h3>
                        <p className="text-base font-semibold text-green-700">
                          {formatCurrency(selectedTransaction.amount)}
                        </p>
                      </div>
                      
                      {selectedTransaction.type === 'invoice' && selectedTransaction.balance !== undefined && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Balance Due</h3>
                          <p className="text-base font-semibold text-blue-700">
                            {formatCurrency(selectedTransaction.balance)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show ledger entries in a second card */}
              <Card>
                <CardHeader>
                  <CardTitle>Journal Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {!ledgerEntries ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : ledgerEntries.length === 0 ? (
                    <p className="text-gray-500 text-sm">No ledger entries found for this transaction.</p>
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
                            <TableCell className="text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : ''}</TableCell>
                            <TableCell className="text-right">{entry.credit > 0 ? formatCurrency(entry.credit) : ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Actions at the bottom */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedTransaction(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Delete Customer
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCustomer?.name}? This action cannot be undone.
              {customerTransactions && customerTransactions.length > 0 && (
                <p className="mt-2 text-red-500 font-medium">
                  This customer has {customerTransactions.length} associated transaction(s).
                  Please delete all transactions first.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCustomer();
              }}
              disabled={isDeleting || (customerTransactions && customerTransactions.length > 0)}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
              Are you sure you want to delete this 
              {selectedTransactionToDelete?.type === 'invoice' 
                ? ' invoice' 
                : selectedTransactionToDelete?.type === 'payment'
                  ? ' payment' 
                  : selectedTransactionToDelete?.type === 'deposit'
                    ? ' deposit'
                    : ' transaction'}
              {selectedTransactionToDelete?.reference 
                ? ` #${selectedTransactionToDelete.reference}` 
                : ''}? 
              This action cannot be undone and will remove all associated ledger entries.
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
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
    </div>
  );
}