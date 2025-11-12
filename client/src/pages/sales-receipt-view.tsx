import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Printer, 
  FileDown,
  Receipt
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
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { Transaction, LineItem, Contact, SalesTax } from "@shared/schema";

export default function SalesReceiptView() {
  const [, navigate] = useLocation();
  const { backUrl, backLabel, handleBack } = useBackNavigation('/transactions', 'Transactions');
  
  // Extract the sales receipt ID from the URL using wouter
  const [match, params] = useRoute("/sales-receipts/:id");
  const salesReceiptId = params?.id ? parseInt(params.id) : null;
  
  // Fetch sales receipt details
  const { data: salesReceiptData, isLoading: salesReceiptLoading } = useQuery({
    queryKey: ['/api/transactions', salesReceiptId],
    queryFn: async () => {
      if (!salesReceiptId) return null;
      const response = await fetch(`/api/transactions/${salesReceiptId}`);
      if (!response.ok) throw new Error('Failed to fetch sales receipt');
      return response.json();
    },
    enabled: !!salesReceiptId
  });
  
  // Fetch contacts for customer info
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch sales taxes for tax names
  const { data: salesTaxes, isLoading: taxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Extract data once fetched
  const salesReceipt: Transaction | undefined = salesReceiptData?.transaction;
  const lineItems: LineItem[] = salesReceiptData?.lineItems || [];
  
  // Find customer
  const customer = contacts?.find(c => c.id === salesReceipt?.contactId);
  
  // Calculate totals from line items
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTaxAmount = lineItems.reduce((sum, item) => {
    if (!item.salesTaxId || !salesTaxes) return sum;
    const tax = salesTaxes.find(tax => tax.id === item.salesTaxId);
    return sum + (tax ? (item.amount * tax.rate / 100) : 0);
  }, 0);
  const total = subtotal + totalTaxAmount;
  
  // Get tax names used in this sales receipt
  const getTaxNames = (): string[] => {
    if (!salesTaxes || !lineItems) return [];
    
    const taxIds = lineItems
      .filter(item => item.salesTaxId !== null)
      .map(item => item.salesTaxId) as number[];
    
    // Create array of unique tax IDs
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
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  if (salesReceiptLoading || contactsLoading || taxesLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="loading-state">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!salesReceipt) {
    return (
      <div className="max-w-4xl mx-auto p-6" data-testid="not-found-state">
        <h1 className="text-2xl font-bold mb-4">Sales Receipt not found</h1>
        <p className="mb-4">The sales receipt you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {backLabel}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="sales-receipt-view">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBack} data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {backLabel}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" data-testid="button-print">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" data-testid="button-download">
            <FileDown className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
      
      {/* Sales Receipt Details */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Sales Receipt header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-title">
                Sales Receipt {salesReceipt.reference || `#${salesReceipt.id}`}
              </h1>
            </div>
            {salesReceipt.description && (
              <p className="text-gray-600 mt-1" data-testid="text-description">
                {salesReceipt.description}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(salesReceipt.status)} data-testid="badge-status">
            {salesReceipt.status.toUpperCase()}
          </Badge>
        </div>
        
        {/* Sales Receipt Information */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
              <div className="space-y-1">
                <p className="font-medium" data-testid="text-customer-name">
                  {customer?.name || 'Unknown Customer'}
                </p>
                {customer?.email && (
                  <p className="text-sm text-gray-600" data-testid="text-customer-email">
                    {customer.email}
                  </p>
                )}
                {customer?.phone && (
                  <p className="text-sm text-gray-600" data-testid="text-customer-phone">
                    {customer.phone}
                  </p>
                )}
                {customer?.address && (
                  <p className="text-sm text-gray-600" data-testid="text-customer-address">
                    {customer.address}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="font-medium" data-testid="text-date">
                  {format(new Date(salesReceipt.date), 'MMMM dd, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                <p className="font-medium" data-testid="text-reference">
                  {salesReceipt.reference || `SR-${salesReceipt.id}`}
                </p>
              </div>
              {salesReceipt.paymentMethod && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                  <p className="font-medium" data-testid="text-payment-method">
                    {salesReceipt.paymentMethod.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Line Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-line-items">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Qty</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Rate</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b" data-testid={`row-line-item-${index}`}>
                      <td className="px-4 py-3" data-testid={`text-item-description-${index}`}>
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-right" data-testid={`text-item-quantity-${index}`}>
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-right" data-testid={`text-item-rate-${index}`}>
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium" data-testid={`text-item-amount-${index}`}>
                        ${item.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium" data-testid="text-subtotal">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              
              {totalTaxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tax {taxNames.length > 0 && `(${taxNames.join(', ')})`}:
                  </span>
                  <span className="font-medium" data-testid="text-tax">
                    ${totalTaxAmount.toFixed(2)}
                  </span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span data-testid="text-total">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Memo */}
          {salesReceipt.memo && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Memo</h3>
                <p className="text-gray-700" data-testid="text-memo">
                  {salesReceipt.memo}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
