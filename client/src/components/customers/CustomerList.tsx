import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Contact, Transaction } from "@shared/schema";
import { format } from "date-fns";
import { Search, User, ChevronRight, X } from "lucide-react";
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

interface CustomerListProps {
  className?: string;
}

export default function CustomerList({ className }: CustomerListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Fetch customers
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
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
    
  // Filter invoices
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
            <div>
              <div className="p-6">
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
              
              <Tabs defaultValue="invoices" className="px-6">
                <TabsList>
                  <TabsTrigger value="invoices">
                    Invoices ({customerInvoices.length})
                  </TabsTrigger>
                  <TabsTrigger value="expenses">
                    Expenses ({customerExpenses.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoices">
                  <div className="mt-4">
                    <ScrollArea className="h-[400px]">
                      {customerInvoices.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No invoices found for this customer.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerInvoices
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((invoice) => (
                                <TableRow key={invoice.id}>
                                  <TableCell>
                                    {format(new Date(invoice.date), "MMM dd, yyyy")}
                                  </TableCell>
                                  <TableCell>{invoice.reference}</TableCell>
                                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>
                
                <TabsContent value="expenses">
                  <div className="mt-4">
                    <ScrollArea className="h-[400px]">
                      {customerExpenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No expenses found for this customer.
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerExpenses
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((expense) => (
                                <TableRow key={expense.id}>
                                  <TableCell>
                                    {format(new Date(expense.date), "MMM dd, yyyy")}
                                  </TableCell>
                                  <TableCell>{expense.reference}</TableCell>
                                  <TableCell>{formatCurrency(expense.amount)}</TableCell>
                                  <TableCell>{getStatusBadge(expense.status)}</TableCell>
                                </TableRow>
                              ))}
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
                    <h3 className="text-sm font-medium text-gray-500">Total Invoiced</h3>
                    <p className="text-xl font-semibold">
                      {formatCurrency(customerInvoices.reduce((sum, i) => sum + i.amount, 0))}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                    <p className="text-xl font-semibold">
                      {formatCurrency(customerExpenses.reduce((sum, e) => sum + e.amount, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}