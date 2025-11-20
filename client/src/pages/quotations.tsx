import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlusIcon, FileText, Send, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Transaction, Contact } from "@shared/schema";
import CustomerDialog from "@/components/customers/CustomerDialog";
import CustomerList from "@/components/customers/CustomerList";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";

interface Preferences {
  homeCurrency?: string;
}

export default function Quotations() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [quotationToConvert, setQuotationToConvert] = useState<Transaction | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch all transactions
  const { data: transactions, isLoading, refetch } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  // Fetch contacts
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Filter quotations
  const quotations = transactions
    ? transactions
        .filter((transaction) => transaction.status === "quotation")
        .filter((quotation) => {
          if (!searchQuery) return true;
          const query = searchQuery.toLowerCase();
          return (
            quotation.reference?.toLowerCase().includes(query) ||
            quotation.description?.toLowerCase().includes(query)
          );
        })
    : [];
  
  // Get contact name by ID
  const getContactName = (contactId: number | null): string => {
    if (!contactId) return 'No customer';
    if (!contacts) return `ID: ${contactId}`;
    
    const contact = contacts.find(c => c.id === contactId);
    return contact ? contact.name : `ID: ${contactId}`;
  };
  
  // Calculate totals
  const totalQuotations = quotations.reduce((sum, quotation) => sum + quotation.amount, 0);
  const pendingCount = quotations.length;
  
  // Convert quotation mutation
  const convertMutation = useMutation({
    mutationFn: async (quotationId: number) => {
      return await apiRequest(`/api/quotations/${quotationId}/convert`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation converted to invoice successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setQuotationToConvert(null);
      setLocation('/invoices');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quotation",
        variant: "destructive",
      });
    },
  });
  
  const handleConvertConfirm = () => {
    if (quotationToConvert) {
      convertMutation.mutate(quotationToConvert.id);
    }
  };
  
  return (
    <div className="py-6 min-h-screen">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex justify-between items-center mb-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          Quotations
        </h1>
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
          
          <Link href="/quotations/new">
            <Button className="text-white bg-primary hover:bg-primary/90" data-testid="button-new-quotation">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Quoted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold" data-testid="text-total-quoted">
                  {formatCurrency(totalQuotations, homeCurrency, homeCurrency)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Pending Quotations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-blue-600" data-testid="text-pending-count">
                  {pendingCount}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Average Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-purple-600" data-testid="text-average-value">
                  {pendingCount > 0 
                    ? formatCurrency(totalQuotations / pendingCount, homeCurrency, homeCurrency)
                    : formatCurrency(0, homeCurrency, homeCurrency)
                  }
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Search Filter */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-4">
            <div className="relative w-full sm:w-64">
              <Input
                className="pl-10"
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-quotations"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Tabbed Content - Quotations and Customers */}
          <Tabs defaultValue="quotations" className="mb-6">
            <TabsList>
              <TabsTrigger value="quotations" data-testid="tab-quotations">Quotations</TabsTrigger>
              <TabsTrigger value="customers" data-testid="tab-customers">Customers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="quotations" className="mt-4">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <p>Loading quotations...</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quotation #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Valid Until</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6">
                              No quotations found
                            </TableCell>
                          </TableRow>
                        ) : (
                          quotations.map((quotation) => (
                            <TableRow key={quotation.id} className="hover:bg-gray-50" data-testid={`row-quotation-${quotation.id}`}>
                              <TableCell className="text-sm text-gray-500" data-testid={`text-quotation-number-${quotation.id}`}>
                                {quotation.reference}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-gray-900" data-testid={`text-customer-${quotation.id}`}>
                                  {(() => {
                                    const contact = contacts?.find(c => c.id === quotation.contactId);
                                    const contactName = getContactName(quotation.contactId);
                                    return formatContactName(contactName, contact?.currency, homeCurrency);
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500" data-testid={`text-date-${quotation.id}`}>
                                {format(new Date(quotation.date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500" data-testid={`text-valid-until-${quotation.id}`}>
                                {quotation.dueDate 
                                  ? format(new Date(quotation.dueDate), 'MMM dd, yyyy')
                                  : '-'
                                }
                              </TableCell>
                              <TableCell className="text-sm font-medium text-gray-900" data-testid={`text-amount-${quotation.id}`}>
                                {formatCurrency(quotation.amount, quotation.currency, homeCurrency)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Link 
                                    href={`/invoices/${quotation.id}`}
                                    className="text-primary hover:text-primary/90"
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-3"
                                      data-testid={`button-view-${quotation.id}`}
                                    >
                                      View
                                    </Button>
                                  </Link>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-3 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                    data-testid={`button-send-${quotation.id}`}
                                  >
                                    <Send className="h-4 w-4 mr-1" />
                                    Send
                                  </Button>
                                  
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-3 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => setQuotationToConvert(quotation)}
                                        data-testid={`button-convert-${quotation.id}`}
                                      >
                                        <FileCheck className="h-4 w-4 mr-1" />
                                        Convert to Invoice
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent data-testid="dialog-convert-confirmation">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Convert Quotation to Invoice?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will convert quotation <strong>{quotation.reference}</strong> to an invoice.
                                          The quotation status will be changed and it will appear in your invoices list.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel 
                                          onClick={() => setQuotationToConvert(null)}
                                          data-testid="button-cancel-convert"
                                        >
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={handleConvertConfirm}
                                          className="bg-green-600 hover:bg-green-700"
                                          disabled={convertMutation.isPending}
                                          data-testid="button-confirm-convert"
                                        >
                                          {convertMutation.isPending ? 'Converting...' : 'Convert to Invoice'}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
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
