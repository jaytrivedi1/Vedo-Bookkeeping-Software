import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, FileText, CreditCard, PiggyBank } from "lucide-react";
import TransactionTable from "@/components/dashboard/TransactionTable";
import CustomerDialog from "@/components/customers/CustomerDialog";
import CustomerList from "@/components/customers/CustomerList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Transaction } from "@shared/schema";

export default function Invoices() {

  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch all transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Filter invoices
  const invoices = transactions
    ? transactions
        .filter((transaction) => transaction.type === "invoice")
        .filter((invoice) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            invoice.reference.toLowerCase().includes(query) ||
            invoice.description?.toLowerCase().includes(query)
          );
        })
    : [];
  
  // Get total amounts
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  
  // Calculate paid amounts based on original amounts minus remaining balance
  const totalPaid = invoices.reduce((sum, invoice) => {
    // If invoice is completed, add full amount
    if (invoice.status === "completed" || invoice.status === "paid") {
      return sum + invoice.amount;
    }
    // For partially paid invoices, add the paid portion (original amount - balance)
    else if ((invoice.status === "open" || invoice.status === "partial") && 
             invoice.balance !== null && invoice.balance !== undefined) {
      return sum + (invoice.amount - invoice.balance);
    }
    return sum;
  }, 0);
  
  // Calculate open amounts based on remaining balances
  const totalPending = invoices.reduce((sum, invoice) => {
    if ((invoice.status === "open" || invoice.status === "overdue" || invoice.status === "partial") && 
        invoice.balance !== null && invoice.balance !== undefined) {
      return sum + invoice.balance;
    } else if ((invoice.status === "open" || invoice.status === "overdue" || invoice.status === "partial") && 
               (invoice.balance === null || invoice.balance === undefined)) {
      return sum + invoice.amount;
    }
    return sum;
  }, 0);
  
  return (
    <div className="py-6 min-h-screen">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">Invoices</h1>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-muted-foreground font-medium">{format(new Date(), 'MMMM d, yyyy')}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <CustomerDialog 
                    buttonLabel="Add Customer" 
                    buttonVariant="secondary"
                    onSuccess={() => refetch()}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new customer</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-white bg-primary hover:bg-primary/90">
                <PlusIcon className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/invoices/new">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Invoice</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/payment-receive">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Receive Payment</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/deposits">
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>Deposit</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <FileText className="mr-2 h-4 w-4" />
                <span>Customer Credit</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalInvoiced)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPaid)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-yellow-600">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalPending)}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            

          </div>
          
          {/* Tabbed Content - Invoices and Customers */}
          <Tabs defaultValue="invoices" className="mb-6">
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoices" className="mt-4">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <TransactionTable 
                  transactions={invoices} 
                  loading={isLoading} 
                  onDeleteSuccess={() => refetch()}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="customers" className="mt-4">
              <CustomerList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
