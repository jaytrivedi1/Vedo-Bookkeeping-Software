import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  FileText, 
  Printer, 
  FileDown, 
  Edit2,
  Mail,
  HelpCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Transaction, LineItem, Contact, SalesTax } from "@shared/schema";

export default function InvoiceView() {
  const [, navigate] = useLocation();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Extract the invoice ID from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/invoices\/(\d+)/);
    if (match && match[1]) {
      setInvoiceId(parseInt(match[1]));
    } else {
      navigate("/invoices");
    }
  }, [navigate]);
  
  // Define extended transaction interface with dueDate
  interface InvoiceWithExtras extends Transaction {
    dueDate?: Date;
    subTotal?: number;
    taxAmount?: number;
    paymentTerms?: string;
  }

  // Define payment history interfaces
  interface PaymentHistoryItem {
    transaction: Transaction;
    amountApplied: number;
    date: string;
    description: string;
  }

  interface PaymentHistory {
    invoice: Transaction;
    payments: PaymentHistoryItem[];
    summary: {
      originalAmount: number;
      totalPaid: number;
      remainingBalance: number;
    }
  }
  
  // Add a mutation for recalculating the invoice balance
  const recalculateBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) {
        throw new Error('No invoice ID available');
      }
      const response = await apiRequest(
        'POST', 
        `/api/transactions/${invoiceId}/recalculate`
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to recalculate balance');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', invoiceId, 'payment-history'] });
      toast({
        title: "Balance recalculated",
        description: "Invoice balance has been recalculated successfully",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to recalculate",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Fetch invoice details
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: !!invoiceId
  });
  
  // Fetch contacts for customer info
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch sales taxes for tax names
  const { data: salesTaxes, isLoading: taxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Fetch payment history for this invoice
  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery<PaymentHistory>({
    queryKey: ['/api/transactions', invoiceId, 'payment-history'],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}/payment-history`);
      if (!response.ok) throw new Error('Failed to fetch payment history');
      return response.json();
    },
    enabled: !!invoiceId
  });
  
  // Extract data once fetched
  const invoice: InvoiceWithExtras | undefined = invoiceData?.transaction;
  const lineItems: LineItem[] = invoiceData?.lineItems || [];
  
  // Find customer
  const customer = contacts?.find(c => c.id === invoice?.contactId);
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate tax by line item
  const calculateTaxAmount = (lineItem: LineItem): number => {
    if (!lineItem.salesTaxId || !salesTaxes) return 0;
    const tax = salesTaxes.find(tax => tax.id === lineItem.salesTaxId);
    return tax ? (lineItem.amount * tax.rate / 100) : 0;
  };
  
  const totalTaxAmount = lineItems.reduce((sum, item) => sum + calculateTaxAmount(item), 0);
  const total = subtotal + totalTaxAmount;
  
  // Get tax names used in this invoice
  const getTaxNames = (): string[] => {
    if (!salesTaxes || !lineItems) return [];
    
    const taxIds = lineItems
      .filter(item => item.salesTaxId !== null)
      .map(item => item.salesTaxId) as number[];
    
    // Create array of unique tax IDs without using Set
    const uniqueTaxIds: number[] = [];
    taxIds.forEach(id => {
      if (!uniqueTaxIds.includes(id)) {
        uniqueTaxIds.push(id);
      }
    });
    
    return uniqueTaxIds
      .map(id => salesTaxes.find(tax => tax.id === id)?.name)
      .filter(name => name !== undefined) as string[];
  };
  
  const taxNames = getTaxNames();
  
  // Get status badge color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (invoiceLoading || contactsLoading || taxesLoading || paymentsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Invoice not found</h1>
        <p className="mb-4">The invoice you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => navigate("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Send by Email
          </Button>
          <Link href={`/invoice-edit/${invoice.id}`}>
            <Button size="sm">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button 
            size="sm"
            variant="outline"
            onClick={() => recalculateBalanceMutation.mutate()}
            disabled={recalculateBalanceMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${recalculateBalanceMutation.isPending ? 'animate-spin' : ''}`} />
            Recalculate Balance
          </Button>
        </div>
      </div>
      
      {/* Invoice Details */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Invoice header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Invoice #{invoice.reference}</h1>
            <p className="text-gray-500">
              {invoice.date ? format(new Date(invoice.date), 'MMMM d, yyyy') : 'No date'}
            </p>
          </div>
          <Badge 
            className={`px-3 py-1 text-sm ${getStatusColor(invoice.status)}`}
          >
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
        </div>
        
        {/* Invoice body */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left side - From/To */}
            <div>
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-500 mb-2">FROM</h2>
                <p className="font-medium">Your Company Name</p>
                <p className="text-gray-600">123 Business Avenue</p>
                <p className="text-gray-600">Business City, State 12345</p>
                <p className="text-gray-600">accounting@yourcompany.com</p>
              </div>
              
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-2">TO</h2>
                {customer ? (
                  <>
                    <p className="font-medium">{customer.name}</p>
                    {customer.contactName && <p className="text-gray-600">{customer.contactName}</p>}
                    {customer.address && <p className="text-gray-600">{customer.address}</p>}
                    {customer.email && <p className="text-gray-600">{customer.email}</p>}
                  </>
                ) : (
                  <p className="text-gray-600">No customer information</p>
                )}
              </div>
            </div>
            
            {/* Right side - Payment details */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number:</span>
                <span>{invoice.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date:</span>
                <span>{invoice.date ? format(new Date(invoice.date), 'MMMM d, yyyy') : 'No date'}</span>
              </div>
              {/* Due Date - only show if available */}
              <div className="flex justify-between">
                <span className="text-gray-500">Due Date:</span>
                <span>
                  {invoice.dueDate 
                    ? format(new Date(invoice.dueDate), 'MMMM d, yyyy') 
                    : 'Not specified'
                  }
                </span>
              </div>
              <div className="flex justify-between font-medium pt-2">
                <span>Amount Due:</span>
                <span>${invoice.amount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Line Items */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3">Items</h2>
            <div className="bg-gray-50 rounded-md">
              <div className="grid grid-cols-8 gap-4 px-4 py-3 border-b text-sm font-medium text-gray-500">
                <div className="col-span-3">Description</div>
                <div className="col-span-1 text-center">Quantity</div>
                <div className="col-span-1 text-center">Unit Price</div>
                <div className="col-span-1 text-center">Tax</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              
              {lineItems.length > 0 ? (
                <div className="divide-y">
                  {lineItems.map((item, index) => {
                    const tax = item.salesTaxId ? salesTaxes?.find(t => t.id === item.salesTaxId) : null;
                    
                    return (
                      <div key={index} className="grid grid-cols-8 gap-4 px-4 py-3 items-center">
                        <div className="col-span-3">
                          <p className="font-medium">{item.description}</p>
                        </div>
                        <div className="col-span-1 text-center">{item.quantity}</div>
                        <div className="col-span-1 text-center">${item.unitPrice.toFixed(2)}</div>
                        <div className="col-span-1 text-center">
                          {tax ? `${tax.name} (${tax.rate}%)` : 'None'}
                        </div>
                        <div className="col-span-2 text-right">${item.amount.toFixed(2)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-3 text-center text-gray-500">
                  No items
                </div>
              )}
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72">
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="text-gray-500">Subtotal:</div>
                <div className="text-right">${subtotal.toFixed(2)}</div>
                
                {totalTaxAmount > 0 && (
                  <>
                    <div className="text-gray-500">
                      {taxNames.length > 0 
                        ? taxNames.join(', ')  
                        : 'Tax'}:
                    </div>
                    <div className="text-right">${totalTaxAmount.toFixed(2)}</div>
                  </>
                )}
                
                <div className="text-gray-800 font-medium pt-2 border-t">Total:</div>
                <div className="text-right font-medium pt-2 border-t">${total.toFixed(2)}</div>
                
                {/* Use payment history values for accurate numbers */}
                <div className="text-gray-800 font-medium">Amount Paid:</div>
                <div className="text-right font-medium">
                  ${paymentHistory?.summary?.totalPaid?.toFixed(2) || '0.00'}
                </div>
                
                <div className="text-gray-800 font-bold">Balance Due:</div>
                <div className="text-right font-bold">
                  ${paymentHistory?.summary?.remainingBalance?.toFixed(2) || (invoice.balance || total).toFixed(2)}
                </div>
                
                {paymentHistory && paymentHistory.summary && (
                  <>
                    <div className="col-span-2 border-t border-dashed mt-2 pt-2 text-xs text-gray-500 text-right">
                      * Based on payment history shown below
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Payment History */}
          {paymentHistory && paymentHistory.payments && paymentHistory.payments.length > 0 && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-lg font-medium mb-3">Payment History</h2>
              <div className="bg-gray-50 rounded-md">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-sm font-medium text-gray-500">
                  <div className="col-span-3">Date</div>
                  <div className="col-span-3">Transaction</div>
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                <div className="divide-y">
                  {paymentHistory.payments.map((payment, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 px-4 py-3 items-center">
                      <div className="col-span-3">
                        {payment.date && format(new Date(payment.date), 'MMM d, yyyy')}
                      </div>
                      <div className="col-span-3">
                        <div className="font-medium">{payment.transaction.type.replace('_', ' ')}</div>
                        <div className="text-sm text-gray-500">#{payment.transaction.reference || payment.transaction.id}</div>
                      </div>
                      <div className="col-span-4 text-gray-600">
                        {payment.description}
                      </div>
                      <div className="col-span-2 text-right font-medium">
                        ${payment.amountApplied.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Summary row */}
                <div className="px-4 py-3 bg-gray-100 grid grid-cols-12 gap-4 font-medium">
                  <div className="col-span-10 text-right">Total Applied:</div>
                  <div className="col-span-2 text-right">${paymentHistory.summary.totalPaid.toFixed(2)}</div>
                </div>
              </div>
              
              {/* Balance calculation */}
              <div className="mt-4 bg-blue-50 p-4 rounded-md">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-700">Original Amount:</div>
                  <div className="text-right">${paymentHistory.summary.originalAmount.toFixed(2)}</div>
                  
                  <div className="text-gray-700">Total Payments:</div>
                  <div className="text-right">- ${paymentHistory.summary.totalPaid.toFixed(2)}</div>
                  
                  <div className="text-gray-800 font-medium pt-2 border-t border-blue-200">Current Balance:</div>
                  <div className="text-right font-medium pt-2 border-t border-blue-200">
                    ${paymentHistory.summary.remainingBalance.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.description && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-lg font-medium mb-2">Notes</h2>
              <p className="text-gray-600">{invoice.description}</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t text-center text-sm text-gray-500">
          Thank you for your business!
        </div>
      </div>
    </div>
  );
}