import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Printer, FileDown, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Transaction, LineItem, Contact, SalesTax } from "@shared/schema";

interface InvoiceWithExtras extends Transaction {
  dueDate?: Date;
  subTotal?: number;
  taxAmount?: number;
  paymentTerms?: string;
}

interface PublicInvoiceData {
  transaction: InvoiceWithExtras;
  lineItems: LineItem[];
  customer: Contact | null;
  company: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
  };
  salesTaxes: SalesTax[];
}

export default function InvoicePublicView() {
  const [token, setToken] = useState<string | null>(null);
  const [viewTracked, setViewTracked] = useState(false);

  // Extract the token from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/invoice\/public\/([^/]+)/);
    if (match && match[1]) {
      setToken(match[1]);
    }
  }, []);

  // Fetch invoice data from public endpoint
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery<PublicInvoiceData>({
    queryKey: ['/api/invoices/public', token],
    queryFn: async () => {
      if (!token) return null;
      const response = await fetch(`/api/invoices/public/${token}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      return response.json();
    },
    enabled: !!token
  });

  // Track "viewed" activity using secure public endpoint
  const trackViewMutation = useMutation({
    mutationFn: async (publicToken: string) => {
      const response = await fetch(`/api/invoices/public/${publicToken}/track-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error('Failed to track view');
      }
      return response.json();
    }
  });

  // Track view when invoice data is loaded (only once)
  useEffect(() => {
    if (invoiceData?.transaction && !viewTracked && token) {
      trackViewMutation.mutate(token);
      setViewTracked(true);
    }
  }, [invoiceData, viewTracked, token, trackViewMutation]);

  const invoice = invoiceData?.transaction;
  const lineItems = invoiceData?.lineItems || [];
  const customer = invoiceData?.customer;
  const company = invoiceData?.company;
  const salesTaxes = invoiceData?.salesTaxes || [];

  // Calculate totals
  const subtotal = invoice?.subTotal ?? lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTaxAmount = invoice?.taxAmount ?? lineItems.reduce((sum, item) => {
    if (!item.salesTaxId || !salesTaxes) return sum;
    const tax = salesTaxes.find(tax => tax.id === item.salesTaxId);
    return sum + (tax ? (item.amount * tax.rate / 100) : 0);
  }, 0);
  const total = invoice?.amount ?? (subtotal + totalTaxAmount);

  // Get tax names
  const getTaxNames = (): string[] => {
    if (!salesTaxes || !lineItems) return [];
    
    const taxIds = lineItems
      .filter(item => item.salesTaxId !== null)
      .map(item => item.salesTaxId) as number[];
    
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  if (invoiceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice || !invoiceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Invoice Not Found</h1>
          <p className="text-gray-600 mb-4">
            The invoice you are looking for does not exist or is no longer available.
          </p>
          <p className="text-sm text-gray-500">
            Please check the link or contact the sender for assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header - Print/Download Actions */}
        <div className="flex justify-end gap-2 mb-6 print:hidden">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrint}
            data-testid="button-print-invoice"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            data-testid="button-download-invoice"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Invoice Card */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden" data-testid="invoice-card">
          {/* Company Logo and Header */}
          <div className="px-6 py-6 border-b">
            <div className="flex justify-between items-start mb-4">
              {/* Company Logo */}
              {company?.logoUrl && (
                <div className="w-48 h-16 flex items-center" data-testid="company-logo">
                  <img 
                    src={company.logoUrl} 
                    alt={company.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              {!company?.logoUrl && (
                <div className="text-left">
                  <h2 className="text-2xl font-bold text-gray-900" data-testid="company-name">
                    {company?.name || 'Company Name'}
                  </h2>
                </div>
              )}
              
              <Badge 
                className={`px-3 py-1 text-sm ${getStatusColor(invoice.status)}`}
                data-testid="invoice-status"
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </Badge>
            </div>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900" data-testid="invoice-title">
                Invoice #{invoice.reference}
              </h1>
              <p className="text-gray-500 mt-1" data-testid="invoice-date">
                {invoice.date ? format(new Date(invoice.date), 'MMMM d, yyyy') : 'No date'}
              </p>
            </div>
          </div>

          {/* Invoice Body */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left side - From/To */}
              <div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">FROM</h3>
                  <p className="font-medium text-gray-900" data-testid="company-from-name">
                    {company?.name || 'Company Name'}
                  </p>
                  {company?.address && (
                    <p className="text-gray-600" data-testid="company-from-address">
                      {company.address}
                    </p>
                  )}
                  {company?.phone && (
                    <p className="text-gray-600" data-testid="company-from-phone">
                      {company.phone}
                    </p>
                  )}
                  {company?.email && (
                    <p className="text-gray-600" data-testid="company-from-email">
                      {company.email}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">BILL TO</h3>
                  {customer ? (
                    <>
                      <p className="font-medium text-gray-900" data-testid="customer-name">
                        {customer.name}
                      </p>
                      {customer.contactName && (
                        <p className="text-gray-600" data-testid="customer-contact-name">
                          {customer.contactName}
                        </p>
                      )}
                      {customer.address && (
                        <p className="text-gray-600" data-testid="customer-address">
                          {customer.address}
                        </p>
                      )}
                      {customer.email && (
                        <p className="text-gray-600" data-testid="customer-email">
                          {customer.email}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-600">No customer information</p>
                  )}
                </div>
              </div>

              {/* Right side - Invoice details */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Number:</span>
                  <span className="font-medium" data-testid="invoice-number">
                    {invoice.reference}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Invoice Date:</span>
                  <span className="font-medium" data-testid="invoice-date-detail">
                    {invoice.date ? format(new Date(invoice.date), 'MMMM d, yyyy') : 'No date'}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Due Date:</span>
                    <span className="font-medium" data-testid="invoice-due-date">
                      {format(new Date(invoice.dueDate), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-900 font-semibold">Amount Due:</span>
                  <span className="text-gray-900 font-semibold text-lg" data-testid="amount-due">
                    ${invoice.balance !== null && invoice.balance !== undefined 
                      ? Math.max(0, invoice.balance).toFixed(2) 
                      : total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-3">Items</h3>
              <div className="bg-gray-50 rounded-md overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-sm font-medium text-gray-500">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-center">Unit Price</div>
                  <div className="col-span-3 text-right">Amount</div>
                </div>

                {lineItems.length > 0 ? (
                  <div className="divide-y">
                    {lineItems.map((item, index) => {
                      const tax = item.salesTaxId ? salesTaxes?.find(t => t.id === item.salesTaxId) : null;
                      
                      return (
                        <div 
                          key={index} 
                          className="grid grid-cols-12 gap-4 px-4 py-3 items-center"
                          data-testid={`line-item-${index}`}
                        >
                          <div className="col-span-5">
                            <p className="font-medium text-gray-900">{item.description}</p>
                            {tax && (
                              <p className="text-xs text-gray-500">Tax: {tax.name} ({tax.rate}%)</p>
                            )}
                          </div>
                          <div className="col-span-2 text-center text-gray-700">
                            {item.quantity}
                          </div>
                          <div className="col-span-2 text-center text-gray-700">
                            ${item.unitPrice.toFixed(2)}
                          </div>
                          <div className="col-span-3 text-right font-medium text-gray-900">
                            ${item.amount.toFixed(2)}
                          </div>
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
              <div className="w-80">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium" data-testid="subtotal">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>

                  {totalTaxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        {taxNames.length > 0 ? taxNames.join(', ') : 'Tax'}:
                      </span>
                      <span className="font-medium" data-testid="tax-amount">
                        ${totalTaxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-gray-900 font-semibold">Total:</span>
                    <span className="text-gray-900 font-semibold" data-testid="total">
                      ${total.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between pt-2 border-t border-gray-900">
                    <span className="text-gray-900 font-bold text-lg">Balance Due:</span>
                    <span className="text-gray-900 font-bold text-lg" data-testid="balance-due">
                      ${invoice.balance !== null && invoice.balance !== undefined 
                        ? Math.max(0, invoice.balance).toFixed(2) 
                        : total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.description && (
              <div className="mt-8 pt-6 border-t">
                <h3 className="text-lg font-medium mb-2">Notes</h3>
                <p className="text-gray-600" data-testid="invoice-notes">
                  {invoice.description}
                </p>
              </div>
            )}
          </div>

          {/* Footer with Pay Now button */}
          <div className="px-6 py-6 bg-gray-50 border-t">
            <div className="flex flex-col items-center justify-center gap-4">
              {invoice.status !== 'paid' && invoice.balance && invoice.balance > 0 && (
                <Button 
                  size="lg" 
                  className="w-full md:w-auto min-w-[200px]"
                  data-testid="button-pay-now"
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pay Now - ${invoice.balance.toFixed(2)}
                </Button>
              )}
              <p className="text-center text-sm text-gray-500">
                Thank you for your business!
              </p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center mt-6 text-sm text-gray-500 print:hidden">
          <p>If you have any questions about this invoice, please contact {company?.email || 'us'}.</p>
        </div>
      </div>
    </div>
  );
}
