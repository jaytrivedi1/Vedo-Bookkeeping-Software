import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { 
  ArrowLeft,
  Save,
  Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "../components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AccountType, Account, Contact } from "@shared/schema";

const paymentSchema = z.object({
  contactId: z.coerce.number(),
  date: z.date(),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  reference: z.string().optional(),
  depositAccountId: z.coerce.number(),
  amount: z.coerce.number().min(0, "Amount must be greater than or equal to 0"),
  note: z.string().optional(),
});

const paymentLineItemSchema = z.object({
  transactionId: z.coerce.number(),
  amount: z.coerce.number().min(0),
  selected: z.boolean().default(false),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentLineItem = z.infer<typeof paymentLineItemSchema>;

export default function PaymentReceive() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentLineItems, setPaymentLineItems] = useState<PaymentLineItem[]>([]);
  const [depositLineItems, setDepositLineItems] = useState<PaymentLineItem[]>([]);
  const [totalApplied, setTotalApplied] = useState(0);
  const [totalCreditsApplied, setTotalCreditsApplied] = useState(0);
  const [unappliedCredit, setUnappliedCredit] = useState(0);

  // Fetch contacts (customers only)
  const { data: allContacts, isLoading: isContactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  // Filter contacts to show only customers
  const contacts = allContacts?.filter((contact: Contact) => 
    contact.type === 'customer'
  ) || [];

  // Fetch accounts (for deposit accounts)
  const { data: accounts, isLoading: isAccountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Filter for bank accounts and credit accounts
  const depositAccounts = accounts?.filter(
    (account: Account) => account.type === AccountType.BANK || account.type === AccountType.CREDIT
  ) || [];

  // Create form
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      paymentMethod: "",
      reference: "",
      amount: 0,
      note: "",
    },
  });

  const watchContactId = form.watch("contactId");
  const watchAmount = form.watch("amount");

  // Fetch customer's invoices when contact changes
  const { data: customerInvoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['/api/transactions', { type: 'invoice', contactId: watchContactId }],
    queryFn: async () => {
      if (!watchContactId) return [];
      
      // Get all transactions
      const allTransactions = await apiRequest(`/api/transactions`);
      
      // Filter by selected customer and only select invoices with balance > 0
      // This ensures we only get unpaid or partially paid invoices
      return allTransactions.filter((invoice: any) => 
        invoice.contactId === watchContactId && 
        invoice.type === 'invoice' &&
        invoice.status !== 'paid' &&
        (invoice.balance === undefined || invoice.balance > 0)
      );
    },
    enabled: !!watchContactId,
  });
  
  // Fetch customer's deposits (unapplied credits)
  const { data: customerDeposits, isLoading: isDepositsLoading } = useQuery({
    queryKey: ['/api/transactions', { type: 'deposit', contactId: watchContactId }],
    queryFn: async () => {
      if (!watchContactId) return [];
      // Get all deposits for this customer
      const allTransactions = await apiRequest(`/api/transactions`);
      // Filter for unapplied credit deposits for this customer
      return allTransactions.filter((transaction: any) => 
        transaction.type === 'deposit' && 
        transaction.contactId === watchContactId &&
        transaction.status === 'unapplied_credit'
      );
    },
    enabled: !!watchContactId,
  });

  // Reset payment line items when customer changes
  useEffect(() => {
    if (customerInvoices && customerInvoices.length > 0) {
      const items = customerInvoices.map((invoice: any) => ({
        transactionId: invoice.id,
        amount: 0,
        selected: false,
      }));
      setPaymentLineItems(items);
    } else {
      setPaymentLineItems([]);
    }
  }, [customerInvoices]);
  
  // Initialize deposit line items when deposits change
  useEffect(() => {
    if (customerDeposits && customerDeposits.length > 0) {
      const items = customerDeposits.map((deposit: any) => ({
        transactionId: deposit.id,
        amount: 0,
        selected: false,
      }));
      setDepositLineItems(items);
    } else {
      setDepositLineItems([]);
    }
  }, [customerDeposits]);

  // Update totals when any value changes
  useEffect(() => {
    const applied = paymentLineItems.reduce((sum, item) => sum + (item.selected ? item.amount : 0), 0);
    setTotalApplied(applied);
    
    const unapplied = Math.max(0, (watchAmount || 0) - applied);
    setUnappliedCredit(unapplied);
  }, [paymentLineItems, watchAmount]);

  // Handle invoice line item changes
  const handleLineItemChange = (index: number, field: 'amount' | 'selected', value: number | boolean) => {
    const updatedItems = [...paymentLineItems];
    
    if (field === 'amount' && typeof value === 'number') {
      // Ensure amount doesn't exceed the invoice balance
      const invoice = customerInvoices?.find((inv: any) => inv.id === updatedItems[index].transactionId);
      const maxAmount = invoice?.balance || invoice?.amount || 0;
      updatedItems[index].amount = Math.min(value, maxAmount);
      
      // If an amount is entered, auto-select the invoice
      if (value > 0 && !updatedItems[index].selected) {
        updatedItems[index].selected = true;
      }
      
      // If amount is set to 0, deselect the invoice
      if (value === 0) {
        updatedItems[index].selected = false;
      }
    } else if (field === 'selected' && typeof value === 'boolean') {
      updatedItems[index].selected = value;
      
      // If deselected, reset amount to 0
      if (!value) {
        updatedItems[index].amount = 0;
      } else {
        // When selected, always auto-fill with the invoice balance
        const invoice = customerInvoices?.find((inv: any) => inv.id === updatedItems[index].transactionId);
        const invoiceBalance = invoice?.balance || invoice?.amount || 0;
        updatedItems[index].amount = invoiceBalance;
      }
    }
    
    // Calculate new totals immediately
    const newTotalApplied = updatedItems.reduce(
      (sum, item) => sum + (item.selected ? item.amount : 0), 
      0
    );
    
    // Set the updated items and totals
    setPaymentLineItems(updatedItems);
    setTotalApplied(newTotalApplied);
    setUnappliedCredit(Math.max(0, (watchAmount || 0) - newTotalApplied));
  };
  
  // Handle deposit credit line item changes
  const handleCreditLineItemChange = (index: number, field: 'amount' | 'selected', value: number | boolean) => {
    const updatedItems = [...depositLineItems];
    
    // Get the total invoice amount selected for payment
    const totalInvoiceAmount = paymentLineItems.reduce(
      (sum, item) => sum + (item.selected ? item.amount : 0), 
      0
    );
    
    if (field === 'amount' && typeof value === 'number') {
      // Ensure amount doesn't exceed the deposit's available credit balance
      const deposit = customerDeposits?.find((dep: any) => dep.id === updatedItems[index].transactionId);
      const maxDepositAmount = Math.abs(deposit?.balance || 0);
      console.log(`Credit #${deposit.id}: balance=${deposit.balance}, amount=${deposit.amount}, using ${deposit.balance}`);
      const depositReference = deposit?.reference || '';
      
      // Calculate how much credit has already been applied from other deposit items
      const otherCreditsApplied = depositLineItems.reduce(
        (sum, item, i) => i !== index && item.selected ? sum + item.amount : sum, 
        0
      );
      
      // Calculate the maximum amount that can be applied based on invoice totals
      // We shouldn't apply more total credits than there are invoice amounts to pay
      const remainingInvoiceAmount = Math.max(0, totalInvoiceAmount - otherCreditsApplied);
      
      // The maximum amount is the smaller of: deposit amount, remaining invoice amount
      const maxAmount = Math.min(maxDepositAmount, remainingInvoiceAmount);
      
      // Apply the limit
      updatedItems[index].amount = Math.min(value, maxAmount);
      
      // If an amount is entered, auto-select the deposit
      if (value > 0 && !updatedItems[index].selected) {
        updatedItems[index].selected = true;
      }
      
      // If amount is set to 0, deselect the deposit
      if (value === 0) {
        updatedItems[index].selected = false;
      }
      
      // Show detailed error message based on which limit was hit
      if (value > maxAmount) {
        if (remainingInvoiceAmount < maxDepositAmount && value > remainingInvoiceAmount) {
          // Case: User tried to apply more credits than total invoice amounts
          toast({
            title: "Critical Accounting Rule",
            description: "Credits cannot exceed invoice amounts. This prevents incorrect accounting balances and ensures proper financial record-keeping.",
            variant: "destructive"
          });
        } else if (value > maxDepositAmount) {
          // Case: User tried to apply more than the available credit balance
          toast({
            title: "Insufficient Credit",
            description: `Credit from ${depositReference} has only $${maxDepositAmount.toFixed(2)} available. You cannot apply more than the available balance.`,
            variant: "destructive"
          });
        }
      }
    } else if (field === 'selected' && typeof value === 'boolean') {
      updatedItems[index].selected = value;
      
      // If deselected, reset amount to 0
      if (!value) {
        updatedItems[index].amount = 0;
      } else {
        // When selected, auto-fill with the appropriate amount
        const deposit = customerDeposits?.find((dep: any) => dep.id === updatedItems[index].transactionId);
        const depositAmount = Math.abs(deposit?.balance || 0);
        console.log(`Credit #${deposit.id}: balance=${deposit.balance}, amount=${deposit.amount}, using -${depositAmount}`);
        
        // Calculate how much credit has already been applied from other deposit items
        const otherCreditsApplied = depositLineItems.reduce(
          (sum, item, i) => i !== index && item.selected ? sum + item.amount : sum, 
          0
        );
        
        // Calculate the maximum amount that can be applied based on invoice totals
        const remainingInvoiceAmount = Math.max(0, totalInvoiceAmount - otherCreditsApplied);
        
        // Use the smaller of deposit amount or remaining invoice amount
        updatedItems[index].amount = Math.min(depositAmount, remainingInvoiceAmount);
        
        // If there's no room to apply any credit, show a message
        if (remainingInvoiceAmount === 0 && depositAmount > 0) {
          updatedItems[index].selected = false;
          toast({
            title: "Critical Accounting Rule",
            description: "Credits cannot exceed invoice amounts. Please select invoices before applying credits.",
            variant: "destructive"
          });
        }
      }
    }
    
    // Calculate new credits applied immediately
    const newTotalCreditsApplied = updatedItems.reduce(
      (sum, item) => sum + (item.selected ? item.amount : 0), 
      0
    );
    
    // Set the updated items and totals
    setDepositLineItems(updatedItems);
    setTotalCreditsApplied(newTotalCreditsApplied);
  };

  // Auto-apply button handler
  const handleAutoApply = () => {
    if (!customerInvoices || !watchAmount) return;
    
    let remainingAmount = watchAmount;
    const updatedItems = [...paymentLineItems];
    
    // Sort invoices by date (oldest first)
    const sortedInvoices = [...customerInvoices].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Reset all amounts and selections
    updatedItems.forEach(item => {
      item.amount = 0;
      item.selected = false;
    });
    
    // Apply payment to invoices until amount is exhausted
    for (const invoice of sortedInvoices) {
      if (remainingAmount <= 0) break;
      
      const itemIndex = updatedItems.findIndex(item => item.transactionId === invoice.id);
      if (itemIndex === -1) continue;
      
      const paymentAmount = Math.min(invoice.balance || invoice.amount, remainingAmount);
      updatedItems[itemIndex].amount = paymentAmount;
      updatedItems[itemIndex].selected = paymentAmount > 0;
      remainingAmount -= paymentAmount;
    }
    
    // Calculate totals after applying
    const appliedTotal = updatedItems.reduce((sum, item) => sum + (item.selected ? item.amount : 0), 0);
    setTotalApplied(appliedTotal);
    setUnappliedCredit(Math.max(0, watchAmount - appliedTotal));
    
    // Set the updated items to state
    setPaymentLineItems(updatedItems);
    
    // Force update the UI inputs
    setTimeout(() => {
      // Update all payment input fields with calculated values
      const paymentInputs = document.querySelectorAll('td.px-6.py-4.whitespace-nowrap input[type="text"]');
      updatedItems.forEach((item, index) => {
        if (index < paymentInputs.length) {
          (paymentInputs[index] as HTMLInputElement).value = item.amount.toString();
        }
      });
    }, 100);
  };

  // Payment creation mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/payments', 'POST', data);
    },
    onSuccess: (data) => {
      toast({
        title: "Payment Received",
        description: "Payment has been successfully recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
      
      // Navigate to the payment details page
      if (data && data.id) {
        navigate(`/payments/${data.id}`);
      } else {
        navigate("/dashboard");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    console.log("Form submitted with values:", values);
    
    // Only include selected invoice line items
    const appliedItems = paymentLineItems
      .filter(item => item.selected && item.amount > 0)
      .map(item => ({
        transactionId: item.transactionId,
        amount: item.amount,
        type: 'invoice'
      }));
    
    // Include selected deposit credit line items
    const appliedCreditItems = depositLineItems
      .filter(item => item.selected && item.amount > 0)
      .map(item => ({
        transactionId: item.transactionId,
        amount: item.amount,
        type: 'deposit'
      }));
    
    // Combine both types of line items
    const allLineItems = [...appliedItems, ...appliedCreditItems];
    
    // Make sure we have at least one line item
    if (allLineItems.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one invoice or credit to apply the payment to.",
        variant: "destructive",
      });
      return;
    }
    
    // Check the net balance after applying credits against invoices
    const totalAppliedAmount = appliedItems.reduce((sum, item) => sum + item.amount, 0);
    const totalCreditsAmount = appliedCreditItems.reduce((sum, item) => sum + item.amount, 0);
    const netBalance = totalAppliedAmount - totalCreditsAmount - values.amount;
    
    console.log("Balance calculation:", {
      totalAppliedToInvoices: totalAppliedAmount,
      totalCreditsApplied: totalCreditsAmount,
      amountReceived: values.amount,
      netBalance: netBalance
    });
    
    // Check for accounting issues with balance or credits
    if (netBalance > 0) {
      toast({
        title: "Accounting Balance Error",
        description: "The total amounts applied must equal or exceed the payment amount plus applied credits. Please adjust your entries.",
        variant: "destructive",
      });
      return;
    }
    
    // Verify no invoice is overpaid with credits
    const invoiceOverpayments = paymentLineItems
      .filter(item => item.selected)
      .map(item => {
        const invoice = customerInvoices?.find((inv: any) => inv.id === item.transactionId);
        const invoiceBalance = invoice?.balance || 0;
        return {
          invoice,
          overpayment: Math.max(0, item.amount - invoiceBalance)
        };
      })
      .filter(check => check.overpayment > 0);
      
    if (invoiceOverpayments.length > 0) {
      const firstOverpayment = invoiceOverpayments[0];
      toast({
        title: "Invoice Overpayment Prevented",
        description: `Invoice #${firstOverpayment.invoice?.reference} would be overpaid by $${firstOverpayment.overpayment.toFixed(2)}. Please correct the amount.`,
        variant: "destructive",
      });
      return;
    }

    const selectedContact = contacts?.find((c: any) => c.id === values.contactId);
    
    const paymentData = {
      ...values,
      type: 'payment',
      status: 'completed',
      description: `Payment received from ${selectedContact?.name || 'customer'}`,
      lineItems: allLineItems,
      unappliedAmount: unappliedCredit,
      totalCreditsApplied: totalCreditsApplied
    };
    
    paymentMutation.mutate(paymentData);
  };

  const isLoading = isContactsLoading || isAccountsLoading || paymentMutation.isPending;

  // Calculate net balance after applying credits
  const netBalanceAfterCredits = Math.max(0, totalApplied - totalCreditsApplied);

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className="mr-4"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Receive Payment</h1>
          </div>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading}
            className="bg-primary text-white"
          >
            {paymentMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Record Payment
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Payment Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                          disabled={isContactsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contacts?.map((contact: any) => (
                              <SelectItem key={contact.id} value={contact.id.toString()}>
                                {contact.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchContactId && contacts && (
                    <div>
                      <FormLabel>Email</FormLabel>
                      <Input
                        value={contacts.find((c: any) => c.id === watchContactId)?.email || ''}
                        disabled
                        className="bg-muted/50"
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <DatePicker
                            date={field.value}
                            setDate={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Transaction ID or cheque number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="depositAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deposit To</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || ""}
                          disabled={isAccountsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {depositAccounts.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name} ({account.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount Received</FormLabel>
                        <FormControl>
                          <input
                            type="text"
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0.00"
                            defaultValue={field.value || ''}
                            onChange={(e) => {
                              // Update for real-time feedback
                              const tempValue = parseFloat(e.target.value);
                              if (!isNaN(tempValue)) {
                                // Update form value
                                field.onChange(tempValue);
                                
                                // Update unapplied credit instantly
                                const applied = paymentLineItems.reduce(
                                  (sum, item) => sum + (item.selected ? item.amount : 0), 
                                  0
                                );
                                setTotalApplied(applied);
                                setUnappliedCredit(Math.max(0, tempValue - applied));
                              }
                            }}
                            onBlur={(e) => {
                              const numValue = parseFloat(e.target.value);
                              if (!isNaN(numValue)) {
                                field.onChange(numValue);
                              } else {
                                // Reset to zero for invalid value
                                e.target.value = '0';
                                field.onChange(0);
                                setUnappliedCredit(0);
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        {totalCreditsApplied > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Amount can be zero when credits balance invoices
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel>Memo / Notes</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Add any additional notes here" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Apply Payment to Invoices Section */}
            {watchContactId && customerInvoices && customerInvoices.length > 0 && (
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Apply Payment to Invoices</CardTitle>
                    <Button
                      type="button"
                      onClick={handleAutoApply}
                      variant="outline"
                      size="sm"
                      disabled={(!watchAmount || watchAmount <= 0) && totalCreditsApplied <= 0}
                    >
                      Auto Apply
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isInvoicesLoading ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div>
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Select
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice #
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Due Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Balance
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerInvoices.map((invoice: any, idx: number) => (
                              <tr key={invoice.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Checkbox
                                    id={`invoice-${invoice.id}`}
                                    checked={paymentLineItems[idx]?.selected || false}
                                    onCheckedChange={(checked) => 
                                      handleLineItemChange(idx, 'selected', !!checked)
                                    }
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {invoice.reference || `INV-${invoice.id}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {format(new Date(invoice.date), 'MMM dd, yyyy')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.balance || invoice.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="text"
                                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!paymentLineItems[idx]?.selected}
                                    defaultValue={paymentLineItems[idx]?.amount || ''}
                                    onChange={(e) => {
                                      // Update the UI immediately to show applied/unapplied amounts
                                      // Even though we'll properly set state on blur
                                      const tempValue = parseFloat(e.target.value);
                                      if (!isNaN(tempValue)) {
                                        // Create a temporary set of items for calculation
                                        const tempItems = [...paymentLineItems];
                                        tempItems[idx].amount = tempValue;
                                        tempItems[idx].selected = tempValue > 0;
                                        const applied = tempItems.reduce((sum, item) => sum + (item.selected ? item.amount : 0), 0);
                                        setTotalApplied(applied);
                                        setUnappliedCredit(Math.max(0, (watchAmount || 0) - applied));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const numValue = parseFloat(e.target.value);
                                      if (!isNaN(numValue)) {
                                        handleLineItemChange(idx, 'amount', numValue);
                                      } else {
                                        // Reset to zero for invalid value
                                        e.target.value = '0';
                                        handleLineItemChange(idx, 'amount', 0);
                                      }
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary will be shown at the bottom of the page */}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Unapplied Credits Section */}
            {watchContactId && customerDeposits && customerDeposits.length > 0 && (
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Available Unapplied Credits</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {isDepositsLoading ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div>
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Select
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Credit #
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Apply
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {customerDeposits.map((deposit: any, idx: number) => (
                              <tr key={deposit.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Checkbox
                                    id={`deposit-${deposit.id}`}
                                    checked={depositLineItems[idx]?.selected || false}
                                    onCheckedChange={(checked) => 
                                      handleCreditLineItemChange(idx, 'selected', !!checked)
                                    }
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {deposit.reference || `DEP-${deposit.id}`}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {format(new Date(deposit.date), 'MMM dd, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                  <div className="truncate">{deposit.description || 'Deposit'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(deposit.balance || 0))}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <input
                                    type="text"
                                    className="flex h-9 w-28 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!depositLineItems[idx]?.selected}
                                    defaultValue={depositLineItems[idx]?.amount || ''}
                                    onChange={(e) => {
                                      const tempValue = parseFloat(e.target.value);
                                      if (!isNaN(tempValue)) {
                                        // Create a temporary set of items for calculation
                                        const tempItems = [...depositLineItems];
                                        tempItems[idx].amount = tempValue;
                                        tempItems[idx].selected = tempValue > 0;
                                        const applied = tempItems.reduce((sum, item) => sum + (item.selected ? item.amount : 0), 0);
                                        setTotalCreditsApplied(applied);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const numValue = parseFloat(e.target.value);
                                      if (!isNaN(numValue)) {
                                        handleCreditLineItemChange(idx, 'amount', numValue);
                                      } else {
                                        // Reset to zero for invalid value
                                        e.target.value = '0';
                                        handleCreditLineItemChange(idx, 'amount', 0);
                                      }
                                    }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Summary will be shown at the bottom of the page */}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Single Summary Section at the end */}
            {watchContactId && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-gray-50 p-4">
                    <div className="flex justify-between items-center text-sm">
                      <span>Total Received:</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mt-2">
                      <span>Total Applied to Invoices:</span>
                      <span className={
                        totalApplied > (watchAmount || 0) && totalApplied > totalCreditsApplied
                          ? "font-medium text-red-600" 
                          : "font-medium"
                      }>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                        {totalApplied > (watchAmount || 0) && totalApplied > totalCreditsApplied && (
                          <span className="ml-2 text-xs">
                            (exceeds available funds)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {totalCreditsApplied > 0 && (
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span>Total Credits Applied:</span>
                        <span className="font-medium text-green-600">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalCreditsApplied)}
                        </span>
                      </div>
                    )}
                    
                    <Separator className="my-3" />
                    
                    {totalCreditsApplied > 0 ? (
                      <div className="flex justify-between items-center font-medium">
                        <span>Net Balance Due:</span>
                        <span className={
                          Math.max(0, totalApplied - totalCreditsApplied - (watchAmount || 0)) > 0 
                            ? "font-semibold text-red-600" 
                            : "font-semibold text-gray-900"
                        }>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                            Math.max(0, totalApplied - totalCreditsApplied - (watchAmount || 0))
                          )}
                          {Math.max(0, totalApplied - totalCreditsApplied - (watchAmount || 0)) === 0 && (
                            <span className="ml-2 text-xs text-green-600">
                              (Balanced)
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center font-medium">
                        <span>Unapplied Credit:</span>
                        <span className={unappliedCredit > 0 ? "text-green-600" : ""}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}