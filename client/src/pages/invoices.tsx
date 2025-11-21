import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, FileText, CreditCard, PiggyBank, Receipt, FileSignature, Pause, Play, Trash2, Clock } from "lucide-react";
import TransactionTable from "@/components/dashboard/TransactionTable";
import CustomerDialog from "@/components/customers/CustomerDialog";
import CustomerList from "@/components/customers/CustomerList";
import SalesReceiptForm from "@/components/forms/SalesReceiptForm";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Transaction, RecurringTemplate } from "@shared/schema";
import { formatCurrency } from "@/lib/currencyUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Preferences {
  homeCurrency?: string;
}

export default function Invoices() {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [salesReceiptDialogOpen, setSalesReceiptDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  
  // Fetch all transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Fetch recurring templates
  const { data: recurringTemplates = [], isLoading: recurringLoading } = useQuery<RecurringTemplate[]>({
    queryKey: ['/api/recurring'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });

  // Recurring template mutations
  const pauseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template paused" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template resumed" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/recurring/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Template deleted" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/recurring/${id}/run-now`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recurring'] });
      toast({ title: "Invoice generated" });
    },
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Filter invoices (excluding quotations)
  const invoices = transactions
    ? transactions
        .filter((transaction) => transaction.type === "invoice" && transaction.status !== "quotation")
        .filter((invoice) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            invoice.reference?.toLowerCase().includes(query) ||
            invoice.description?.toLowerCase().includes(query)
          );
        })
    : [];
  
  // Filter quotations
  const quotations = transactions
    ? transactions
        .filter((transaction) => transaction.type === "invoice" && transaction.status === "quotation")
        .filter((quotation) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            quotation.reference?.toLowerCase().includes(query) ||
            quotation.description?.toLowerCase().includes(query)
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
  
  // Quotation metrics
  const totalQuotations = quotations.reduce((sum, quotation) => sum + quotation.amount, 0);
  const quotationCount = quotations.length;
  
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
                <Link href="/quotations/new">
                  <FileSignature className="mr-2 h-4 w-4" />
                  <span>Quotation</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/recurring-invoices/new">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Recurring Template</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/payment-receive">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Receive Payment</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSalesReceiptDialogOpen(true)}>
                <Receipt className="mr-2 h-4 w-4" />
                <span>Sales Receipt</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/deposits">
                  <PiggyBank className="mr-2 h-4 w-4" />
                  <span>Deposit</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/customer-credits/new">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Customer Credit</span>
                </Link>
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
                <p className="text-2xl font-semibold">{formatCurrency(totalInvoiced, homeCurrency, homeCurrency)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-green-600">{formatCurrency(totalPaid, homeCurrency, homeCurrency)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Open</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-yellow-600">{formatCurrency(totalPending, homeCurrency, homeCurrency)}</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder={
                  activeTab === "recurring" ? "Search templates..." :
                  activeTab === "quotations" ? "Search quotations..." :
                  activeTab === "customers" ? "Search customers..." :
                  "Search invoices..."
                }
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
          
          {/* Tabbed Content - Invoices, Quotations, Recurring, and Customers */}
          <Tabs defaultValue="invoices" className="mb-6" value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="quotations">Quotations</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
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
            
            <TabsContent value="quotations" className="mt-4">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <TransactionTable 
                  transactions={quotations} 
                  loading={isLoading} 
                  onDeleteSuccess={() => refetch()}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="recurring" className="mt-4">
              {recurringLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : recurringTemplates.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No recurring invoice templates yet</p>
                    <Link href="/recurring-invoices/new">
                      <Button variant="outline" className="mt-4">Create First Template</Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Template Name</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Next Run</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recurringTemplates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell>
                              <Link href={`/recurring-invoices/${template.id}/edit`} className="text-blue-600 hover:underline">
                                {template.templateName}
                              </Link>
                            </TableCell>
                            <TableCell>{(template as any).customerName}</TableCell>
                            <TableCell>{formatCurrency(template.totalAmount, homeCurrency, homeCurrency)}</TableCell>
                            <TableCell className="capitalize">{template.frequency}</TableCell>
                            <TableCell>{format(new Date(template.nextRunAt), "MMM dd, yyyy")}</TableCell>
                            <TableCell>
                              <Badge variant={template.status === "active" ? "default" : "secondary"}>
                                {template.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="space-x-2">
                              <Link href={`/recurring-invoices/${template.id}/edit`}>
                                <Button size="sm" variant="outline">Edit</Button>
                              </Link>
                              {template.status === "active" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => pauseMutation.mutate(template.id)}
                                  disabled={pauseMutation.isPending}
                                >
                                  <Pause className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resumeMutation.mutate(template.id)}
                                  disabled={resumeMutation.isPending}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => runNowMutation.mutate(template.id)}
                                disabled={runNowMutation.isPending}
                              >
                                <Clock className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(template.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="customers" className="mt-4">
              <CustomerList />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Sales Receipt Dialog */}
      <Dialog open={salesReceiptDialogOpen} onOpenChange={setSalesReceiptDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sales Receipt</DialogTitle>
            <DialogDescription>
              Record immediate cash sales without creating an invoice
            </DialogDescription>
          </DialogHeader>
          <SalesReceiptForm
            onSuccess={() => {
              setSalesReceiptDialogOpen(false);
              refetch();
            }}
            onCancel={() => setSalesReceiptDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
