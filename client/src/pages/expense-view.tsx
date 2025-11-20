import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Printer, 
  FileDown, 
  Edit2,
  Mail,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Transaction, LineItem, Contact, SalesTax, Account } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency, formatContactName } from "@/lib/currencyUtils";
import { useBackNavigation } from "@/hooks/use-back-navigation";

export default function ExpenseView() {
  const [, navigate] = useLocation();
  const { backUrl, backLabel, handleBack } = useBackNavigation('/expenses', 'Expenses');
  const [expenseId, setExpenseId] = useState<number | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Extract the expense ID from the URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/expenses\/(\d+)/);
    if (match && match[1]) {
      setExpenseId(parseInt(match[1]));
    } else {
      navigate("/expenses");
    }
  }, [navigate]);
  
  // Define extended transaction interface
  interface ExpenseWithExtras extends Transaction {
    subTotal: number | null;
    taxAmount: number | null;
  }
  
  // Fetch expense details
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['/api/transactions', expenseId],
    queryFn: async () => {
      if (!expenseId) return null;
      const response = await fetch(`/api/transactions/${expenseId}`);
      if (!response.ok) throw new Error('Failed to fetch expense');
      return response.json();
    },
    enabled: !!expenseId
  });
  
  // Fetch contacts for vendor info
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Fetch sales taxes for tax names
  const { data: salesTaxes, isLoading: taxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  // Fetch preferences for home currency
  const { data: preferences } = useQuery<{ homeCurrency?: string }>({
    queryKey: ['/api/settings/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  // Fetch accounts for account names
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });
  
  // Extract data once fetched
  const expense: ExpenseWithExtras | undefined = expenseData?.transaction;
  const lineItems: LineItem[] = expenseData?.lineItems || [];
  
  // Find vendor
  const vendor = contacts?.find(c => c.id === expense?.contactId);
  
  // Find payment account
  const paymentAccount = accounts?.find(a => a.id === expense?.paymentAccountId);
  
  // Use saved totals from the transaction (respects manual tax overrides)
  // Fallback to calculating from line items if not saved
  const subtotal = expense?.subTotal ?? lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTaxAmount = expense?.taxAmount ?? lineItems.reduce((sum, item) => {
    if (!item.salesTaxId || !salesTaxes) return sum;
    const tax = salesTaxes.find(tax => tax.id === item.salesTaxId);
    return sum + (tax ? (item.amount * tax.rate / 100) : 0);
  }, 0);
  const total = expense?.amount ?? (subtotal + totalTaxAmount);
  
  // Get tax names used in this expense
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
  
  // Handle delete expense
  const handleDelete = async () => {
    if (!expenseId) return;
    
    setIsDeleteLoading(true);
    try {
      await apiRequest(`/api/transactions/${expenseId}`, 'DELETE');
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowDeleteDialog(false);
      handleBack();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    } finally {
      setIsDeleteLoading(false);
    }
  };
  
  if (expenseLoading || contactsLoading || taxesLoading || accountsLoading) {
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
  
  if (!expense) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4" data-testid="heading-not-found">Expense not found</h1>
        <p className="mb-4">The expense you are looking for does not exist or has been deleted.</p>
        <Button onClick={handleBack} data-testid="button-back-to-expenses">
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
          <Link href={`/expenses/${expense.id}/edit`}>
            <Button size="sm" data-testid="button-edit">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                data-testid="button-delete"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this expense and all associated records.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  disabled={isDeleteLoading}
                >
                  {isDeleteLoading ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {/* Expense Details */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Expense header with status */}
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-expense-reference">Expense #{expense.reference}</h1>
            <p className="text-gray-500" data-testid="text-expense-date">
              {expense.date ? format(new Date(expense.date), 'MMMM d, yyyy') : 'No date'}
            </p>
          </div>
          <Badge 
            className={`px-3 py-1 text-sm ${getStatusColor(expense.status)}`}
            data-testid="badge-status"
          >
            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
          </Badge>
        </div>
        
        {/* Expense body */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left side - Vendor */}
            <div>
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-500 mb-2">PAYEE</h2>
                {vendor ? (
                  <>
                    <p className="font-medium" data-testid="text-vendor-name">{formatContactName(vendor.name, vendor.currency, homeCurrency)}</p>
                    {vendor.contactName && <p className="text-gray-600" data-testid="text-vendor-contact">{vendor.contactName}</p>}
                    {vendor.address && <p className="text-gray-600" data-testid="text-vendor-address">{vendor.address}</p>}
                    {vendor.email && <p className="text-gray-600" data-testid="text-vendor-email">{vendor.email}</p>}
                  </>
                ) : (
                  <p className="text-gray-600">No vendor information</p>
                )}
              </div>
            </div>
            
            {/* Right side - Payment details */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Expense Number:</span>
                <span data-testid="text-expense-number">{expense.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expense Date:</span>
                <span data-testid="text-date">{expense.date ? format(new Date(expense.date), 'MMMM d, yyyy') : 'No date'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Account:</span>
                <span data-testid="text-payment-account">
                  {paymentAccount?.name || 'Not specified'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method:</span>
                <span data-testid="text-payment-method">
                  {getPaymentMethodName(expense.paymentMethod || '')}
                </span>
              </div>
              {expense.paymentDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Date:</span>
                  <span data-testid="text-payment-date">
                    {format(new Date(expense.paymentDate), 'MMMM d, yyyy')}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2">
                <span>Total Amount:</span>
                <span data-testid="text-total-amount">{formatCurrency(expense.amount || 0, expense.currency, homeCurrency)}</span>
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
                        <div className="col-span-2 text-right" data-testid={`text-amount-${index}`}>{formatCurrency(item.amount, expense.currency, homeCurrency)}</div>
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
                <div className="text-right" data-testid="text-subtotal">{formatCurrency(subtotal, expense.currency, homeCurrency)}</div>
                
                {totalTaxAmount > 0 && (
                  <>
                    <div className="text-gray-500">
                      {taxNames.length > 0 
                        ? taxNames.join(', ')  
                        : 'Tax'}:
                    </div>
                    <div className="text-right" data-testid="text-tax">{formatCurrency(totalTaxAmount, expense.currency, homeCurrency)}</div>
                  </>
                )}
                
                <div className="text-gray-800 font-medium pt-2 border-t">Total:</div>
                <div className="text-right font-medium pt-2 border-t" data-testid="text-total">{formatCurrency(total, expense.currency, homeCurrency)}</div>
              </div>
            </div>
          </div>
          
          {/* Memo */}
          {expense.memo && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-lg font-medium mb-3">Memo</h2>
              <p className="text-gray-700 whitespace-pre-wrap" data-testid="text-memo">{expense.memo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
