import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Printer, 
  FileDown, 
  Edit2,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { Transaction, LineItem, Contact, SalesTax, Account } from "@shared/schema";

export default function ChequeView() {
  const [, navigate] = useLocation();
  const [chequeId, setChequeId] = useState<number | null>(null);
  const { backUrl, backLabel, handleBack } = useBackNavigation('/cheques', 'Cheques');
  
  // Extract the cheque ID from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/cheques\/(\d+)/);
    if (match && match[1]) {
      setChequeId(parseInt(match[1]));
    } else {
      handleBack();
    }
  }, [handleBack]);
  
  // Define extended transaction interface
  interface ChequeWithExtras extends Transaction {
    subTotal: number | null;
    taxAmount: number | null;
  }
  
  // Fetch cheque details
  const { data: chequeData, isLoading: chequeLoading } = useQuery({
    queryKey: ['/api/transactions', chequeId],
    queryFn: async () => {
      if (!chequeId) return null;
      const response = await fetch(`/api/transactions/${chequeId}`);
      if (!response.ok) throw new Error('Failed to fetch cheque');
      return response.json();
    },
    enabled: !!chequeId
  });
  
  // Fetch contacts for vendor info
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch sales taxes for tax names
  const { data: salesTaxes, isLoading: taxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Fetch accounts for account names
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<{ homeCurrency?: string }>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Extract data once fetched
  const cheque: ChequeWithExtras | undefined = chequeData?.transaction;
  const lineItems: LineItem[] = chequeData?.lineItems || [];
  
  // Find payee
  const payee = contacts?.find(c => c.id === cheque?.contactId);
  
  // Find payment account (bank account)
  const paymentAccount = accounts?.find(a => a.id === cheque?.paymentAccountId);
  
  // Use saved totals from the transaction (respects manual tax overrides)
  // Fallback to calculating from line items if not saved
  const subtotal = cheque?.subTotal ?? lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTaxAmount = cheque?.taxAmount ?? lineItems.reduce((sum, item) => {
    if (!item.salesTaxId || !salesTaxes) return sum;
    const tax = salesTaxes.find(tax => tax.id === item.salesTaxId);
    return sum + (tax ? (item.amount * tax.rate / 100) : 0);
  }, 0);
  const total = cheque?.amount ?? (subtotal + totalTaxAmount);
  
  // Get tax names used in this cheque
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
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get payment method display name
  const getPaymentMethodName = (method: string): string => {
    const methodMap: Record<string, string> = {
      'cash': 'Cash',
      'check': 'Check',
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'other': 'Other'
    };
    return methodMap[method] || method;
  };
  
  if (chequeLoading || contactsLoading || taxesLoading || accountsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (!cheque) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4" data-testid="heading-not-found">Cheque not found</h1>
        <p className="mb-4">The cheque you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack} data-testid="button-back-to-cheques">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {backLabel}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
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
          <Button variant="outline" size="sm" data-testid="button-email">
            <Mail className="mr-2 h-4 w-4" />
            Send by Email
          </Button>
          <Link href={`/cheques/${cheque.id}/edit`}>
            <Button size="sm" data-testid="button-edit">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Cheque Details */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Cheque header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-cheque-reference">Cheque #{cheque.reference}</h1>
            <p className="text-gray-500" data-testid="text-cheque-date">
              {cheque.date ? format(new Date(cheque.date), 'MMMM d, yyyy') : 'No date'}
            </p>
          </div>
          <Badge 
            className={`px-3 py-1 text-sm ${getStatusColor(cheque.status)}`}
            data-testid="badge-status"
          >
            {cheque.status.charAt(0).toUpperCase() + cheque.status.slice(1)}
          </Badge>
        </div>
        
        {/* Cheque body */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left side - Payee */}
            <div>
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-500 mb-2">PAYEE</h2>
                {payee ? (
                  <>
                    <p className="font-medium" data-testid="text-payee-name">{formatContactName(payee.name, payee.currency, homeCurrency)}</p>
                    {payee.contactName && <p className="text-gray-600" data-testid="text-payee-contact">{payee.contactName}</p>}
                    {payee.address && <p className="text-gray-600" data-testid="text-payee-address">{payee.address}</p>}
                    {payee.email && <p className="text-gray-600" data-testid="text-payee-email">{payee.email}</p>}
                  </>
                ) : (
                  <p className="text-gray-600">No payee information</p>
                )}
              </div>
            </div>
            
            {/* Right side - Payment details */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Cheque Number:</span>
                <span data-testid="text-cheque-number">{cheque.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cheque Date:</span>
                <span data-testid="text-date">{cheque.date ? format(new Date(cheque.date), 'MMMM d, yyyy') : 'No date'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bank Account:</span>
                <span data-testid="text-payment-account">
                  {paymentAccount?.name || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span data-testid="text-payment-method">
                  {getPaymentMethodName(cheque.paymentMethod || '')}
                </span>
              </div>
              {cheque.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Date:</span>
                  <span data-testid="text-payment-date">
                    {format(new Date(cheque.paymentDate), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2">
                <span>Total Amount:</span>
                <span data-testid="text-total-amount">{formatCurrency(cheque.amount || 0, cheque.currency, homeCurrency)}</span>
              </div>
            </div>
          </div>
          
          {/* Line Items */}
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3">Line Items</h2>
            <div className="bg-gray-50 rounded-md">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b text-sm font-medium text-gray-500">
                <div className="col-span-3">Account</div>
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Tax</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              
              {lineItems.length > 0 ? (
                <div className="divide-y">
                  {lineItems.map((item, index) => {
                    const tax = item.salesTaxId ? salesTaxes?.find(t => t.id === item.salesTaxId) : null;
                    const account = item.accountId ? accounts?.find(a => a.id === item.accountId) : null;
                    
                    return (
                      <div key={index} className="grid grid-cols-12 gap-4 px-4 py-3 items-center" data-testid={`line-item-${index}`}>
                        <div className="col-span-3">
                          <p className="font-medium" data-testid={`text-account-${index}`}>{account?.name || 'N/A'}</p>
                        </div>
                        <div className="col-span-5">
                          <p data-testid={`text-description-${index}`}>{item.description}</p>
                        </div>
                        <div className="col-span-2 text-center" data-testid={`text-tax-${index}`}>
                          {tax ? `${tax.name} (${tax.rate}%)` : 'None'}
                        </div>
                        <div className="col-span-2 text-right" data-testid={`text-amount-${index}`}>{formatCurrency(item.amount, cheque.currency, homeCurrency)}</div>
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
                <div className="text-right" data-testid="text-subtotal">{formatCurrency(subtotal, cheque.currency, homeCurrency)}</div>
                
                {totalTaxAmount > 0 && (
                  <>
                    <div className="text-gray-500">
                      {taxNames.length > 0 
                        ? taxNames.join(', ')  
                        : 'Tax'}:
                    </div>
                    <div className="text-right" data-testid="text-tax">{formatCurrency(totalTaxAmount, cheque.currency, homeCurrency)}</div>
                  </>
                )}
                
                <div className="text-gray-800 font-medium pt-2 border-t">Total:</div>
                <div className="text-right font-medium pt-2 border-t" data-testid="text-total">{formatCurrency(total, cheque.currency, homeCurrency)}</div>
              </div>
            </div>
          </div>
          
          {/* Memo */}
          {cheque.memo && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-lg font-medium mb-3">Memo</h2>
              <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-memo">{cheque.memo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
