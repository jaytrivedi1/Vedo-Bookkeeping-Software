import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Contact, Transaction, LedgerEntry } from "@shared/schema";
import { format, startOfMonth, isSameMonth, parseISO } from "date-fns";
import { Search, User, ChevronRight, X, Eye, Trash2, AlertTriangle, Edit, PenLine, FileText, DollarSign, Receipt, ArrowDownCircle, ArrowUpCircle, CreditCard } from "lucide-react";
import ContactEditForm from "@/components/forms/ContactEditForm";
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
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
    
  // Filter transactions for the Invoices tab (invoices + payments + deposits + cheques + sales receipts + transfers)
  const customerInvoicesAndPayments = customerTransactions
    ? customerTransactions.filter(transaction => 
        transaction.type === 'invoice' || 
        transaction.type === 'payment' ||
        transaction.type === 'deposit' ||
        transaction.type === 'cheque' ||
        transaction.type === 'sales_receipt' ||
        transaction.type === 'transfer')
    : [];
    
  // Filter just invoices (for calculations and counts)
  const customerInvoices = customerTransactions
    ? customerTransactions.filter(transaction => transaction.type === 'invoice')
    : [];
    
  // Filter unapplied credits (deposits with status 'unapplied_credit')
  const customerUnappliedCredits = customerTransactions
    ? customerTransactions.filter(transaction => 
        transaction.type === 'deposit' && 
        transaction.status === 'unapplied_credit')
    : [];
    
  // Ensure we use the most up-to-date data when customer details are opened
  useEffect(() => {
    if (selectedCustomer) {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    }
  }, [selectedCustomer, queryClient]);
    
  // Filter expenses
  const customerExpenses = customerTransactions
    ? customerTransactions.filter(transaction => transaction.type === 'expense')
    : [];
    
  // Format currency
  const formatCurrency = (amount: number, transactionType?: string, status?: string) => {
    // In the activity feed, all amounts display as positive for clarity
    // Color coding handles visual distinction (green for money in, blue for money out)
    const displayAmount = Math.abs(amount);
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(displayAmount);
  };
  
  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>;
      case 'open':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      // No longer used, keeping for backward compatibility
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
      case 'unapplied_credit':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Unapplied Credit</Badge>;
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
      // Use the dedicated payment deletion endpoint for payments
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
        <SheetContent className="w-[80vw] sm:max-w-[1000px] p-0">
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
                  <div className="flex justify-between items-start">
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1"
                      onClick={() => setIsEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
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
                      <div className="space-y-6">
                        {(() => {
                          // Sort transactions by date (newest first)
                          const sortedTransactions = customerInvoicesAndPayments
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                          
                          // Group by month
                          const groupedByMonth = sortedTransactions.reduce((acc, transaction) => {
                            const monthKey = format(new Date(transaction.date), "MMMM yyyy");
                            if (!acc[monthKey]) {
                              acc[monthKey] = [];
                            }
                            acc[monthKey].push(transaction);
                            return acc;
                          }, {} as Record<string, Transaction[]>);
                          
                          return Object.entries(groupedByMonth).map(([monthKey, monthTransactions]) => (
                            <div key={monthKey}>
                              <h4 className="text-sm font-medium text-gray-500 mb-3">{monthKey}</h4>
                              <div className="space-y-2">
                                {monthTransactions.map((transaction, index, sortedArray) => {
                              // Find relationship information
                              const relatedPayments = [];
                              const relatedInvoices = [];
                              let relationshipNote = '';
                              let rowClasses = '';
                              
                              // For payments, find related invoices from description
                              if (transaction.type === 'payment') {
                                // Try to extract invoice references from description
                                const invoiceRefRegex = /invoice #(\d+)/gi;
                                let match;
                                const extractedRefs = [];
                                
                                while ((match = invoiceRefRegex.exec(transaction.description || '')) !== null) {
                                  extractedRefs.push(match[1]);
                                }
                                
                                // Find any related invoices
                                if (extractedRefs.length > 0) {
                                  for (const ref of extractedRefs) {
                                    const relatedInvoice = sortedArray.find(t => 
                                      t.type === 'invoice' && t.reference === ref
                                    );
                                    
                                    if (relatedInvoice) {
                                      relatedInvoices.push(relatedInvoice);
                                      rowClasses = 'bg-blue-50';
                                    }
                                  }
                                  
                                  // Create relationship note
                                  if (relatedInvoices.length > 0) {
                                    relationshipNote = `Applied to Invoice${relatedInvoices.length > 1 ? 's' : ''} #${extractedRefs.join(', #')}`;
                                  }
                                }
                              }
                              
                              // For invoices, find payments that mention this invoice
                              else if (transaction.type === 'invoice') {
                                const invoiceRef = transaction.reference;
                                if (invoiceRef) {
                                  // Find payments that mention this invoice
                                  for (const t of sortedArray) {
                                    if (t.type === 'payment' && t.description && 
                                        t.description.toLowerCase().includes(`invoice #${invoiceRef}`)) {
                                      relatedPayments.push(t);
                                      rowClasses = 'bg-blue-50';
                                    }
                                  }
                                  
                                  // Create relationship note
                                  if (relatedPayments.length > 0) {
                                    relationshipNote = `Payment${relatedPayments.length > 1 ? 's' : ''} received`;
                                  }
                                }
                              }
                              
                              // For deposits/credits, show what they're available for
                              else if (transaction.type === 'deposit' && transaction.status === 'unapplied_credit') {
                                rowClasses = 'bg-green-50';
                                relationshipNote = 'Available credit';
                                
                                // If this credit came from a payment, indicate that
                                if (transaction.description && transaction.description.includes('Unapplied credit from payment')) {
                                  const paymentMatch = transaction.description.match(/from payment #(\d+)/i);
                                  if (paymentMatch && paymentMatch[1]) {
                                    relationshipNote = `Available credit from Payment #${paymentMatch[1]}`;
                                  }
                                }
                              }
                              
                              // Format transaction type for display
                              const typeDisplay = transaction.type === 'invoice' 
                                ? 'Invoice'
                                : transaction.type === 'payment'
                                  ? 'Payment'
                                  : transaction.type === 'deposit'
                                    ? transaction.status === 'unapplied_credit' ? 'Credit' : 'Deposit'
                                    : transaction.type === 'sales_receipt'
                                      ? 'Sales Receipt'
                                      : transaction.type === 'transfer'
                                        ? 'Transfer'
                                        : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                              
                              // Determine balance display approach
                              const showBalance = transaction.type === 'invoice' || transaction.type === 'payment';
                              
                              // Determine status badge
                              const statusBadge = transaction.type === 'deposit'
                                ? transaction.status === 'unapplied_credit'
                                  ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Unapplied Credit</Badge>
                                  : <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>
                                : transaction.type === 'invoice' && 
                                  (transaction.balance === 0 || transaction.status === 'paid' || transaction.status === 'completed')
                                  ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>
                                : transaction.type === 'invoice' && 
                                  transaction.balance !== null && 
                                  transaction.balance !== undefined &&
                                  transaction.balance > 0
                                    ? <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>
                                    : getStatusBadge(transaction.status);
                              
                              // Get icon for transaction type
                              const getTransactionIcon = () => {
                                switch (transaction.type) {
                                  case 'invoice':
                                    return <FileText className="h-5 w-5" />;
                                  case 'payment':
                                    return <DollarSign className="h-5 w-5" />;
                                  case 'deposit':
                                    return <ArrowDownCircle className="h-5 w-5" />;
                                  case 'sales_receipt':
                                    return <Receipt className="h-5 w-5" />;
                                  case 'transfer':
                                    return <ArrowUpCircle className="h-5 w-5" />;
                                  default:
                                    return <CreditCard className="h-5 w-5" />;
                                }
                              };
                              
                              // Get icon color
                              const iconColor = transaction.type === 'invoice' 
                                ? 'text-blue-600 bg-blue-50'
                                : transaction.type === 'payment' || transaction.type === 'deposit'
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-gray-600 bg-gray-50';
                                
                              return (
                                <div 
                                  key={transaction.id} 
                                  className="group relative bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
                                  data-testid={`transaction-card-${transaction.id}`}
                                >
                                  <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconColor} flex items-center justify-center`}>
                                      {getTransactionIcon()}
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-gray-900">{typeDisplay}</h4>
                                            {statusBadge}
                                          </div>
                                          <div className="flex items-center gap-3 text-sm text-gray-500">
                                            <span>{format(new Date(transaction.date), "MMM dd, yyyy")}</span>
                                            {transaction.reference && (
                                              <>
                                                <span>•</span>
                                                <span className="font-medium">#{transaction.reference}</span>
                                              </>
                                            )}
                                          </div>
                                          {relationshipNote && (
                                            <p className="text-xs text-gray-500 mt-1">{relationshipNote}</p>
                                          )}
                                        </div>
                                        
                                        {/* Amount */}
                                        <div className="text-right">
                                          <div className={`text-lg font-semibold ${
                                            transaction.type === 'payment' || 
                                            transaction.type === 'deposit' || 
                                            transaction.type === 'sales_receipt'
                                              ? 'text-green-600' 
                                              : transaction.type === 'invoice'
                                                ? 'text-blue-900'
                                                : 'text-gray-900'
                                          }`}>
                                            {formatCurrency(transaction.amount, transaction.type, transaction.status)}
                                          </div>
                                          {showBalance && transaction.balance !== null && (
                                            <div className="text-sm text-gray-500 mt-1">
                                              Balance: {formatCurrency(transaction.balance)}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Actions - visible on hover */}
                                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {transaction.type === 'invoice' ? (
                                      <Link href={`/invoices/${transaction.id}`} onClick={(e) => e.stopPropagation()}>
                                        <Button variant="outline" size="sm" data-testid={`view-transaction-${transaction.id}`}>
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      </Link>
                                    ) : transaction.type === 'payment' ? (
                                      <Link href={`/payments/${transaction.id}`} onClick={(e) => e.stopPropagation()}>
                                        <Button variant="outline" size="sm" data-testid={`view-transaction-${transaction.id}`}>
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      </Link>
                                    ) : transaction.type === 'deposit' ? (
                                      <Link href={`/deposits/${transaction.id}`} onClick={(e) => e.stopPropagation()}>
                                        <Button variant="outline" size="sm" data-testid={`view-transaction-${transaction.id}`}>
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                      </Link>
                                    ) : (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedTransaction(transaction);
                                          if (transaction.id) {
                                            refetchLedgerEntries();
                                          }
                                        }}
                                        data-testid={`view-transaction-${transaction.id}`}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    )}
                                    
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTransaction(transaction);
                                      }}
                                      data-testid={`delete-transaction-${transaction.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
                </div>
                
                {/* Summary */}
                <div className="border-t mt-6 p-6">
                  <div className="grid grid-cols-2 gap-4">
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
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Unapplied Credits</h3>
                      <p className="text-xl font-semibold text-blue-700">
                        {formatCurrency(customerUnappliedCredits.reduce((sum, credit) => {
                          // Keep the balance as negative for consistency
                          // This ensures unapplied credits always show as negative throughout the app
                          const creditAmount = (credit.balance !== null && credit.balance !== undefined) 
                            ? credit.balance // Keep it negative for consistency
                            : -Math.abs(credit.amount); // Ensure it's negative if balance not set
                          
                          console.log(`Credit #${credit.id}: balance=${credit.balance}, amount=${credit.amount}, using ${creditAmount}`);
                          return sum + creditAmount;
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
               selectedTransaction?.type === 'deposit' 
                 ? selectedTransaction.status === 'unapplied_credit' 
                    ? 'Deposit (Unapplied Credit)' 
                    : 'Deposit'
                 : selectedTransaction?.type === 'sales_receipt' ? 'Sales Receipt'
                 : selectedTransaction?.type === 'transfer' ? 'Transfer'
                 : (selectedTransaction?.type ? selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1) : 'Transaction')} 
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
                     selectedTransaction.type === 'deposit' 
                        ? selectedTransaction.status === 'unapplied_credit'
                            ? 'Deposit Details (Unapplied Credit)' 
                            : 'Deposit Details'
                        : selectedTransaction.type === 'sales_receipt' ? 'Sales Receipt Details'
                        : selectedTransaction.type === 'transfer' ? 'Transfer Details'
                        : 'Transaction Details'}
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
                              ? 'bg-blue-100 text-blue-800' 
                              : selectedTransaction.status === 'open' 
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
                          {formatCurrency(selectedTransaction.amount, selectedTransaction.type, selectedTransaction.status)}
                        </p>
                      </div>
                      
                      {selectedTransaction.type === 'invoice' && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Balance Due</h3>
                          <p className="text-base font-semibold text-blue-700">
                            {formatCurrency(typeof selectedTransaction.balance === 'number' ? selectedTransaction.balance : 0)}
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
      
      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Customer</DialogTitle>
            <DialogDescription>
              Make changes to customer information below.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <ContactEditForm 
              contact={selectedCustomer} 
              onSuccess={() => {
                setIsEditDialogOpen(false);
                // Refresh the contacts data
                queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}