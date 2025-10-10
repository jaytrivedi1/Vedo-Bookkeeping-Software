import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Contact, Transaction } from "@shared/schema";
import { format } from "date-fns";
import { Search, Building, ChevronRight, X, Edit, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import ContactEditForm from "@/components/forms/ContactEditForm";
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
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface VendorListProps {
  className?: string;
}

export default function VendorList({ className }: VendorListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransactionToDelete, setSelectedTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Fetch vendors
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  const handleVendorClick = (vendor: Contact) => {
    setSelectedVendor(vendor);
    setSidebarOpen(true);
  };
  
  // Filter vendors by search query
  const filteredVendors = contacts
    ? contacts
        .filter(contact => 
          contact.type === 'vendor' || contact.type === 'both'
        )
        .filter(vendor => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            vendor.name.toLowerCase().includes(query) ||
            (vendor.email ? vendor.email.toLowerCase().includes(query) : false) ||
            (vendor.contactName ? vendor.contactName.toLowerCase().includes(query) : false) ||
            (vendor.phone ? vendor.phone.toLowerCase().includes(query) : false)
          );
        })
    : [];
    
  // Filter transactions for selected vendor
  const vendorTransactions = transactions && selectedVendor
    ? transactions.filter(transaction => transaction.contactId === selectedVendor.id)
    : [];
    
  // Filter expenses (including bills, payments, and cheques)
  const vendorExpenses = vendorTransactions
    ? vendorTransactions.filter(transaction => 
        transaction.type === 'expense' || 
        transaction.type === 'bill' || 
        transaction.type === 'payment' ||
        transaction.type === 'cheque'
      )
    : [];
    
  // Filter invoices related to this vendor (rare but possible)
  const vendorInvoices = vendorTransactions
    ? vendorTransactions.filter(transaction => transaction.type === 'invoice')
    : [];
    
  // Format currency
  const formatCurrency = (amount: number, transactionType?: string, status?: string) => {
    // For bill transactions, display as positive since they represent expenses owed
    // For payment and deposit transactions, display as negative
    let displayAmount = amount;
    if (transactionType === 'deposit' || transactionType === 'payment') {
      displayAmount = -Math.abs(amount); // Ensure it's negative
    }
    
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
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Cancelled</Badge>;
      case 'unapplied_credit':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Unapplied Payment</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, transactionType }: { transactionId: number; transactionType: string }) => {
      console.log('Deleting transaction:', transactionType, transactionId);
      
      // Use dedicated payment endpoint for payment and cheque transactions
      // (both may have payment_applications records that need cleanup)
      if (transactionType === 'payment' || transactionType === 'cheque') {
        return apiRequest(`/api/payments/${transactionId}/delete`, 'DELETE');
      }
      
      // Use generic endpoint for other transaction types
      return apiRequest(`/api/transactions/${transactionId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
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

  const handleConfirmDelete = () => {
    if (!selectedTransactionToDelete) return;
    
    setIsDeleting(true);
    deleteTransactionMutation.mutate({ 
      transactionId: selectedTransactionToDelete.id, 
      transactionType: selectedTransactionToDelete.type 
    });
  };
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>Vendors</CardTitle>
          <CardDescription>
            View and manage all your vendors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search vendors..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Vendors list */}
          <ScrollArea className="h-[400px]">
            {contactsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold">No vendors found</h3>
                <p className="mt-1 text-sm">Get started by adding a new vendor.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="p-3 rounded-md border hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => handleVendorClick(vendor)}
                  >
                    <div>
                      <h3 className="font-medium">{vendor.name}</h3>
                      {vendor.email && <p className="text-sm text-gray-500">{vendor.email}</p>}
                      {vendor.phone && (
                        <p className="text-sm text-gray-500">{vendor.phone}</p>
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
      
      {/* Vendor details sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="w-[80vw] sm:max-w-[1000px] p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <SheetTitle className="text-xl">Vendor Details</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>
          
          {selectedVendor && (
            <div>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedVendor.name}</h2>
                    {selectedVendor.contactName && (
                      <p className="text-gray-600 mb-1">Contact: {selectedVendor.contactName}</p>
                    )}
                    {selectedVendor.email && <p className="text-gray-600 mb-1">Email: {selectedVendor.email}</p>}
                    {selectedVendor.phone && (
                      <p className="text-gray-600 mb-1">Phone: {selectedVendor.phone}</p>
                    )}
                    {selectedVendor.address && (
                      <p className="text-gray-600 mb-4">{selectedVendor.address}</p>
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
              
              <Tabs defaultValue="expenses" className="px-6">
                <TabsList>
                  <TabsTrigger value="expenses">
                    Expenses ({vendorExpenses.length})
                  </TabsTrigger>
                  <TabsTrigger value="invoices">
                    Invoices ({vendorInvoices.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="expenses">
                  <div className="mt-4">
                    <ScrollArea className="h-[400px]">
                      {vendorExpenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No expenses found for this vendor.
                        </div>
                      ) : (
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Type</TableHead>
                              <TableHead className="whitespace-nowrap">Reference</TableHead>
                              <TableHead className="whitespace-nowrap">Amount</TableHead>
                              <TableHead className="whitespace-nowrap">Balance</TableHead>
                              <TableHead className="whitespace-nowrap">Status</TableHead>
                              <TableHead className="w-[200px]">Notes</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendorExpenses
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((transaction) => {
                                const typeDisplay = transaction.type === 'bill' 
                                  ? 'Bill'
                                  : transaction.type === 'expense'
                                    ? 'Expense'
                                    : transaction.type === 'payment'
                                      ? 'Payment'
                                      : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1);
                                
                                const showBalance = transaction.type === 'bill' || transaction.type === 'cheque';
                                const notes = transaction.type === 'bill' 
                                  ? 'Vendor bill' 
                                  : transaction.type === 'payment'
                                    ? 'Payment to vendor'
                                    : 'Direct expense';
                                
                                const statusBadge = getStatusBadge(transaction.status);
                                
                                return (
                                  <TableRow key={transaction.id}>
                                    <TableCell>
                                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {typeDisplay}
                                    </TableCell>
                                    <TableCell>
                                      {transaction.reference || '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      {formatCurrency(transaction.amount, transaction.type, transaction.status)}
                                    </TableCell>
                                    <TableCell className={
                                      transaction.balance !== null && transaction.balance > 0 
                                        ? 'font-semibold text-blue-700' 
                                        : ''
                                    }>
                                      {showBalance && transaction.balance !== null 
                                        ? formatCurrency(Math.abs(transaction.balance)) 
                                        : '—'}
                                    </TableCell>
                                    <TableCell>{statusBadge}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      <div className="max-w-[200px] overflow-hidden text-ellipsis">
                                        {notes}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Route to appropriate page based on transaction type
                                            const routeMap: Record<string, string> = {
                                              'bill': `/bills/${transaction.id}`,
                                              'payment': `/payments/${transaction.id}`,
                                              'expense': `/expenses/${transaction.id}`,
                                              'cheque': `/expenses/${transaction.id}`,
                                              'deposit': `/deposits/${transaction.id}`,
                                              'invoice': `/invoices/${transaction.id}`
                                            };
                                            const route = routeMap[transaction.type] || `/expenses/${transaction.id}`;
                                            navigate(route);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                        
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
                    </ScrollArea>
                  </div>
                </TabsContent>
                
                <TabsContent value="invoices">
                  <div className="mt-4">
                    <ScrollArea className="h-[400px]">
                      {vendorInvoices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No invoices found for this vendor.
                        </div>
                      ) : (
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Type</TableHead>
                              <TableHead className="whitespace-nowrap">Reference</TableHead>
                              <TableHead className="whitespace-nowrap">Amount</TableHead>
                              <TableHead className="whitespace-nowrap">Balance</TableHead>
                              <TableHead className="whitespace-nowrap">Status</TableHead>
                              <TableHead className="w-[200px]">Notes</TableHead>
                              <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {vendorInvoices
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((transaction) => {
                                const typeDisplay = 'Invoice';
                                const showBalance = true;
                                const notes = 'Invoice from vendor';
                                
                                const statusBadge = transaction.balance === 0 || transaction.status === 'completed'
                                  ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>
                                  : transaction.balance !== null && transaction.balance > 0
                                    ? <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Open</Badge>
                                    : getStatusBadge(transaction.status);
                                
                                return (
                                  <TableRow key={transaction.id}>
                                    <TableCell>
                                      {format(new Date(transaction.date), "MMM dd, yyyy")}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {typeDisplay}
                                    </TableCell>
                                    <TableCell>
                                      {transaction.reference || '—'}
                                    </TableCell>
                                    <TableCell className="font-semibold">
                                      {formatCurrency(transaction.amount, transaction.type, transaction.status)}
                                    </TableCell>
                                    <TableCell className={
                                      transaction.balance !== null && transaction.balance > 0 
                                        ? 'font-semibold text-blue-700' 
                                        : ''
                                    }>
                                      {showBalance && transaction.balance !== null 
                                        ? formatCurrency(Math.abs(transaction.balance)) 
                                        : '—'}
                                    </TableCell>
                                    <TableCell>{statusBadge}</TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                      <div className="max-w-[200px] overflow-hidden text-ellipsis">
                                        {notes}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // Route to appropriate page based on transaction type
                                            const routeMap: Record<string, string> = {
                                              'invoice': `/invoices/${transaction.id}`,
                                              'payment': `/payments/${transaction.id}`,
                                              'expense': `/expenses/${transaction.id}`,
                                              'deposit': `/deposits/${transaction.id}`
                                            };
                                            const route = routeMap[transaction.type] || `/invoices/${transaction.id}`;
                                            navigate(route);
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-1" />
                                          View
                                        </Button>
                                        
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
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Summary */}
              <div className="border-t mt-6 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                    <p className="text-xl font-semibold">
                      {formatCurrency(vendorExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Invoices</h3>
                    <p className="text-xl font-semibold">
                      {formatCurrency(vendorInvoices.reduce((sum, i) => sum + i.amount, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
      {/* Edit Vendor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Vendor</DialogTitle>
            <DialogDescription>
              Make changes to vendor information below.
            </DialogDescription>
          </DialogHeader>
          
          {selectedVendor && (
            <ContactEditForm 
              contact={selectedVendor} 
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!selectedTransactionToDelete} onOpenChange={(open) => !open && setSelectedTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {selectedTransactionToDelete?.type.replace('_', ' ')} 
              {selectedTransactionToDelete?.reference ? ` (${selectedTransactionToDelete.reference})` : ''} 
              and all associated records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}