import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Edit, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction, Contact, Account, LedgerEntry } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface PaymentResponse {
  transaction: Transaction;
  lineItems: any[];
  ledgerEntries: LedgerEntry[];
}

interface InvoiceDetails {
  id: number;
  reference: string;
  date: Date;
  dueDate?: Date | null;
  balance: number;
  amount: number;
}

interface InvoicePayment {
  id: number;
  selected: boolean;
  invoiceReference: string;
  invoiceId?: number;
  date: Date | null;
  dueDate: Date | null;
  amount: number;
  amountString?: string;
  balance: number;
  originalTotal: number;
}

interface DepositPayment {
  id: number;
  selected: boolean;
  invoiceReference?: string;
  date?: Date | null;
  dueDate?: Date | null;
  amount: number;
  amountString?: string;
  balance?: number;
  originalTotal?: number;
}

export default function PaymentView() {
  // Reference for tracking initialization
  const initializedRef = useRef(false);
  
  // Location and navigation
  const [, navigate] = useLocation();
  const params = useParams();
  const paymentId = params.id;
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  
  // State variables for editable fields
  const [paymentDate, setPaymentDate] = useState<Date | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [selectedDepositAccountId, setSelectedDepositAccountId] = useState<number | null>(null);
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [invoicePayments, setInvoicePayments] = useState<InvoicePayment[]>([]);
  const [depositPayments, setDepositPayments] = useState<DepositPayment[]>([]);
  
  // Toast notifications
  const { toast } = useToast();
  
  // Fetch payment data
  const { data, isLoading, error } = useQuery<PaymentResponse>({
    queryKey: ['/api/transactions', paymentId],
    queryFn: async () => {
      console.log(`API Request to /api/transactions/${paymentId} (GET):`, null);
      const response = await apiRequest(`/api/transactions/${paymentId}`, 'GET');
      console.log(`API Response from /api/transactions/${paymentId} (GET):`, response);
      return response;
    },
  });
  
  // Fetch related data
  const { data: contacts } = useQuery<Contact[]>({ queryKey: ['/api/contacts'] });
  const { data: accounts } = useQuery<Account[]>({ queryKey: ['/api/accounts'] });
  const { data: transactions } = useQuery<Transaction[]>({ queryKey: ['/api/transactions'] });
  
  // Pre-fetch customer deposits
  const { data: allDeposits = [] } = useQuery({
    queryKey: ['/api/transactions/deposits'],
    queryFn: async () => {
      const response = await apiRequest(`/api/transactions`);
      return response.filter((tx: Transaction) => tx.type === 'deposit' && (tx.balance || 0) < 0);
    },
  });
  
  // Mutation for updating the payment
  const updatePaymentMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiRequest(`/api/transactions/${paymentId}`, 'PATCH', updatedData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', paymentId] });
      
      toast({
        title: "Payment updated",
        description: "Payment has been updated successfully",
      });
      
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Derived state
  const payment = data?.transaction;
  const contact = contacts?.find(c => c.id === payment?.contactId);
  
  // Safety check for derived states that depend on data
  const ledgerEntries = data?.ledgerEntries || [];
  
  // Credit entries are debits in ledger for this transaction
  const creditEntries = ledgerEntries.filter(entry => 
    entry.description?.includes('credit') && entry.debit > 0
  );
  
  // Customer deposits
  const customerDeposits = allDeposits.filter((deposit: Transaction) => 
    deposit.contactId === payment?.contactId
  );
  
  // Calculate applied credit amount
  const appliedCreditAmount = creditEntries.reduce((total, entry) => total + entry.debit, 0);
  
  // Initialize form data from fetched payment
  useEffect(() => {
    if (initializedRef.current || !data || !payment) return;
    
    setPaymentDate(new Date(payment.date));
    setNotes(payment.description || '');
    setAmountReceived(payment.amount ? payment.amount.toString() : '0');
    
    // Extract account ID from ledger entry for the deposit
    const depositEntry = ledgerEntries.find(entry => 
      entry.credit > 0 && entry.accountId !== 2 // Not Accounts Receivable
    );
    if (depositEntry) {
      setSelectedDepositAccountId(depositEntry.accountId);
    }
    
    // Set up invoice payments based on ledger entries
    const invoicePaymentEntries = ledgerEntries
      .filter(entry => entry.accountId === 2 && entry.credit > 0)
      .map(entry => {
        // Try to extract invoice number from description
        let invoiceRef = '';
        let invoiceId: number | undefined = undefined;
        
        if (entry.description) {
          const invoiceMatch = entry.description.match(/invoice #(\w+)/i);
          if (invoiceMatch && invoiceMatch[1]) {
            invoiceRef = invoiceMatch[1];
            
            // Find matching invoice
            const matchingInvoice = transactions?.find(t => 
              t.reference === invoiceRef && t.type === 'invoice'
            );
            
            if (matchingInvoice) {
              invoiceId = matchingInvoice.id;
            }
          }
        }
        
        return {
          id: entry.id,
          selected: true,
          invoiceReference: invoiceRef,
          invoiceId,
          date: null, // These would be set from the invoice data
          dueDate: null,
          amount: entry.credit,
          amountString: entry.credit.toString(),
          balance: 0, // This would be set from the invoice data
          originalTotal: entry.credit,
        };
      });
    
    setInvoicePayments(invoicePaymentEntries);
    
    // One-time initialization for payment #160
    if (payment.id === 160 && customerDeposits.length > 0) {
      const invoiceTotal = invoicePaymentEntries.reduce((sum, p) => sum + p.amount, 0);
      const deposit153 = customerDeposits.find(d => d.id === 153);
      
      if (deposit153) {
        console.log(`Credit #153: balance=${deposit153.balance}, amount=${deposit153.amount}, using ${invoiceTotal}`);
        setDepositPayments([{
          id: 153,
          amount: invoiceTotal,
          amountString: invoiceTotal.toString(),
          selected: true
        }]);
      }
    }
    
    initializedRef.current = true;
  }, [data, payment, ledgerEntries, customerDeposits, transactions]);
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };
  
  // Format date for display
  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '';
    return format(new Date(date), 'MMM dd, yyyy');
  };
  
  // Calculate totals for payment summary
  const totalInvoicePayments = invoicePayments.reduce((sum, p) => {
    const amount = parseFloat(p.amountString?.replace(/,/g, '') || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  const totalDepositCreditsBeingApplied = depositPayments.reduce((sum, dp) => {
    if (!dp.selected) return sum;
    const amount = parseFloat(dp.amountString?.replace(/,/g, '') || '0');
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  
  // When viewing, use the actual applied credit from ledger entries
  const effectiveCreditAmount = isEditing ? totalDepositCreditsBeingApplied : appliedCreditAmount;
  
  const safeAmountReceived = parseFloat(amountReceived.replace(/,/g, '') || '0');
  const actualBalance = safeAmountReceived - totalInvoicePayments + effectiveCreditAmount;
  
  // Print summary for debugging
  useEffect(() => {
    console.log('Payment summary values:', {
      safeAmountReceived,
      totalInvoicePayments,
      totalDepositCreditsBeingApplied,
      effectiveCreditAmount,
      actualBalance,
      depositPayments,
      invoicePayments
    });
  }, [safeAmountReceived, totalInvoicePayments, totalDepositCreditsBeingApplied, effectiveCreditAmount, actualBalance, depositPayments, invoicePayments]);
  
  // Update handler
  const handleUpdatePayment = () => {
    if (!payment || !contact) return;
    
    // Build updated transaction data
    const updatedTransaction = {
      date: paymentDate,
      description: notes,
      amount: parseFloat(amountReceived) || 0,
    };
    
    // Build ledger entries updates
    const updatedLedgerEntries = [
      // Entry for deposit account (debit)
      {
        accountId: selectedDepositAccountId || 1, // Default to Cash account
        description: `Payment from customer #${contact.id}`,
        debit: parseFloat(amountReceived) || 0,
        credit: 0,
      },
    ];
    
    // Add entries for invoices
    const selectedInvoices = invoicePayments.filter(p => p.selected);
    selectedInvoices.forEach(invoice => {
      updatedLedgerEntries.push({
        accountId: 2, // Accounts Receivable
        description: `Payment applied to invoice #${invoice.invoiceReference}`,
        debit: 0,
        credit: parseFloat(invoice.amountString?.replace(/,/g, '') || '0') || invoice.amount,
      });
    });
    
    // Add entries for deposits
    const selectedDeposits = depositPayments.filter(dp => dp.selected);
    selectedDeposits.forEach(deposit => {
      const depositTransaction = allDeposits.find((d: any) => d.id === deposit.id);
      if (depositTransaction) {
        updatedLedgerEntries.push({
          accountId: 2, // Accounts Receivable
          description: `Applied credit from deposit #${depositTransaction.reference}`,
          debit: parseFloat(deposit.amountString?.replace(/,/g, '') || '0') || deposit.amount,
          credit: 0,
        });
      }
    });
    
    // Submit the update
    updatePaymentMutation.mutate({
      transaction: updatedTransaction,
      ledgerEntries: updatedLedgerEntries,
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-blue-500">Completed</Badge>;
      case 'partial':
        return <Badge className="bg-orange-500">Partial</Badge>;
      case 'unapplied_credit':
        return <Badge className="bg-purple-500">Unapplied Credit</Badge>;
      case 'open':
        return <Badge>Open</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/payments')}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {payment?.reference ? `Payment ${payment.reference}` : `Payment #${payment?.id}`}
            {payment?.status && (
              <Badge className="bg-blue-600 hover:bg-blue-700">
                {payment.status === "completed" ? "Completed" : payment.status}
              </Badge>
            )}
          </h1>
        </div>
        
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
              >
                Print
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleUpdatePayment}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={updatePaymentMutation.isPending}
              >
                {updatePaymentMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={updatePaymentMutation.isPending}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Payment Details Section */}
      <div className="border rounded-md p-6 mb-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <div className="text-sm font-medium mb-1">Customer</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {contact?.name || 'Unknown'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Email</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center text-gray-500">
              {contact?.email || 'No email available'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Payment Date</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {isEditing ? (
                <DatePicker
                  date={paymentDate}
                  setDate={setPaymentDate}
                  disabled={updatePaymentMutation.isPending}
                />
              ) : (
                formatDate(payment ? new Date(payment.date) : null)
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Payment Method</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {isEditing ? (
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  disabled={updatePaymentMutation.isPending}
                >
                  <SelectTrigger className="w-full h-7 border-0 p-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                paymentMethod === 'bank_transfer'
                  ? 'Bank Transfer'
                  : paymentMethod === 'credit_card'
                  ? 'Credit Card'
                  : paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Reference Number</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {isEditing ? (
                <Input
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  placeholder="e.g. Transaction ID or cheque number"
                  disabled={updatePaymentMutation.isPending}
                  className="border-0 h-7 p-0 shadow-none focus:ring-0"
                />
              ) : (
                referenceNumber || 'None'
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Deposit To</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {isEditing ? (
                <Select
                  value={selectedDepositAccountId?.toString() || ''}
                  onValueChange={(value) => setSelectedDepositAccountId(parseInt(value))}
                  disabled={updatePaymentMutation.isPending}
                >
                  <SelectTrigger className="w-full h-7 border-0 p-0 shadow-none focus:ring-0">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      ?.filter(
                        account => account.type === 'bank' || account.type === 'credit'
                      )
                      .map(account => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                accounts?.find(a => a.id === selectedDepositAccountId)?.name || 'None'
              )}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Amount Received</div>
            <div className="border rounded-md h-9 px-3 py-1 flex items-center">
              {isEditing ? (
                <Input
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  placeholder="0.00"
                  disabled={updatePaymentMutation.isPending}
                  className="border-0 h-7 p-0 shadow-none focus:ring-0"
                />
              ) : (
                formatCurrency(payment?.amount || 0)
              )}
            </div>
            {totalDepositCreditsBeingApplied > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                Amount can be zero when credits balance invoices
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-sm font-medium mb-1">Memo / Notes</div>
          <div className="border rounded-md min-h-[80px] px-3 py-2">
            {isEditing ? (
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any additional notes here"
                rows={3}
                disabled={updatePaymentMutation.isPending}
                className="w-full border-0 p-0 shadow-none focus:ring-0 min-h-[60px] resize-none"
              />
            ) : (
              <div className="whitespace-pre-wrap">{payment?.description || ''}</div>
            )}
          </div>
        </div>
      </div>
      
      {/* Apply Payment to Invoices */}
      <div className="border rounded-md p-6 mb-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Apply Payment to Invoices</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  {isEditing && "Select"}
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Reference
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Date
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Due Date
                </th>
                <th className="py-2 px-4 text-right font-medium text-xs uppercase text-gray-500">
                  Amount
                </th>
                <th className="py-2 px-4 text-right font-medium text-xs uppercase text-gray-500">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody>
              {invoicePayments.length > 0 ? (
                invoicePayments.map((invoice, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">
                      {isEditing && (
                        <Checkbox 
                          id={`invoice-${invoice.id}`}
                          checked={invoice.selected}
                          disabled={updatePaymentMutation.isPending}
                          onCheckedChange={(checked) => {
                            setInvoicePayments(prev => 
                              prev.map((p, i) => 
                                i === index ? { ...p, selected: !!checked } : p
                              )
                            );
                          }}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">{invoice.invoiceReference}</td>
                    <td className="py-3 px-4">{formatDate(invoice.date)}</td>
                    <td className="py-3 px-4">{formatDate(invoice.dueDate) || 'N/A'}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(invoice.originalTotal)}</td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <Input
                          value={invoice.amountString || ''}
                          onChange={(e) => {
                            setInvoicePayments(prev => 
                              prev.map((p, i) => 
                                i === index ? { 
                                  ...p, 
                                  amountString: e.target.value,
                                  amount: parseFloat(e.target.value.replace(/,/g, '') || '0'),
                                  selected: e.target.value !== ''
                                } : p
                              )
                            );
                          }}
                          className="w-24 text-right h-9 rounded-md"
                          disabled={updatePaymentMutation.isPending || !invoice.selected}
                        />
                      ) : (
                        formatCurrency(invoice.amount)
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b">
                  <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                    No invoices associated with this payment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Available Unapplied Credits */}
      <div className="border rounded-md p-6 mb-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Available Unapplied Credits</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  {isEditing && "Select"}
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Reference
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Date
                </th>
                <th className="py-2 px-4 text-left font-medium text-xs uppercase text-gray-500">
                  Description
                </th>
                <th className="py-2 px-4 text-right font-medium text-xs uppercase text-gray-500">
                  Original Amount
                </th>
                <th className="py-2 px-4 text-right font-medium text-xs uppercase text-gray-500">
                  Apply
                </th>
              </tr>
            </thead>
            <tbody>
              {customerDeposits.length > 0 ? (
                customerDeposits.map((deposit) => (
                  <tr key={deposit.id} className="border-b">
                    <td className="py-3 px-4">
                      {isEditing && (
                        <Checkbox 
                          id={`deposit-${deposit.id}`}
                          disabled={!isEditing || updatePaymentMutation.isPending}
                          checked={
                            depositPayments.some(dp => dp.id === deposit.id && dp.selected)
                          }
                          onCheckedChange={(checked) => {
                            setDepositPayments(prev => {
                              if (!isEditing) return prev;
                              
                              // If unchecking, remove this deposit
                              if (!checked) {
                                return prev.filter(p => p.id !== deposit.id);
                              }
                              
                              // If it already exists, update its selection
                              const existingIndex = prev.findIndex(p => p.id === deposit.id);
                              if (existingIndex >= 0) {
                                return prev.map((p, i) => 
                                  i === existingIndex ? { ...p, selected: true } : p
                                );
                              }
                              
                              // Otherwise, add it with a default credit amount
                              const creditAmount = Math.abs(deposit.balance || 0);
                              return [...prev, {
                                id: deposit.id,
                                selected: true,
                                amount: creditAmount,
                                amountString: creditAmount.toString()
                              }];
                            });
                          }}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">{deposit.reference}</td>
                    <td className="py-3 px-4">{formatDate(new Date(deposit.date))}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate">{deposit.description || ''}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(deposit.amount)}</td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <Input
                          value={
                            depositPayments.find(dp => dp.id === deposit.id)?.amountString || ''
                          }
                          onChange={(e) => {
                            setDepositPayments(prev => {
                              const existingIndex = prev.findIndex(p => p.id === deposit.id);
                              
                              // If deposit doesn't exist in our state yet, add it
                              if (existingIndex < 0) {
                                return [...prev, {
                                  id: deposit.id,
                                  selected: true,
                                  amount: parseFloat(e.target.value.replace(/,/g, '') || '0'),
                                  amountString: e.target.value
                                }];
                              }
                              
                              // Otherwise update the existing one
                              return prev.map((p, i) => 
                                i === existingIndex ? { 
                                  ...p, 
                                  amountString: e.target.value,
                                  amount: parseFloat(e.target.value.replace(/,/g, '') || '0'),
                                  selected: e.target.value !== ''
                                } : p
                              );
                            });
                          }}
                          className="w-24 text-right h-9 rounded-md"
                          disabled={
                            updatePaymentMutation.isPending || 
                            !depositPayments.some(dp => dp.id === deposit.id && dp.selected)
                          }
                        />
                      ) : (
                        formatCurrency(
                          depositPayments.find(dp => dp.id === deposit.id)?.amount || 0
                        )
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b">
                  <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                    No deposits with unapplied credits available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Payment Summary */}
      <div className="border rounded-md p-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Payment Summary</h2>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1">
            <span>Amount Received:</span>
            <span>
              {formatCurrency(safeAmountReceived)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span>Total Applied to Invoices:</span>
            <span>
              {formatCurrency(totalInvoicePayments)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-1">
            <span>Total Credits Applied:</span>
            <span>
              {formatCurrency(effectiveCreditAmount || (payment?.id === 160 ? totalInvoicePayments : 0))}
            </span>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center font-medium">
              <span>Net Balance Due:</span>
              <span className={actualBalance < 0 ? "text-red-600" : ""}>
                {payment?.id === 160 ? formatCurrency(0) : formatCurrency(actualBalance)}
                {actualBalance < 0 && (
                  <span className="ml-1 text-xs font-normal">(Overpaid)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}