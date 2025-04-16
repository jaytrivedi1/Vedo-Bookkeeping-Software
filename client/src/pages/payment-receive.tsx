import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowLeft, CircleDollarSign, Loader2, Save } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

// Define account types directly in this file since we don't have many dependencies
enum AccountType {
  BANK = 'bank',
  CREDIT = 'credit_card'
}

// Define the payment form validation schema
const paymentSchema = z.object({
  contactId: z.number({
    required_error: "Customer is required",
  }),
  date: z.date({
    required_error: "Payment date is required",
  }),
  reference: z.string().optional(),
  amount: z.number({
    required_error: "Payment amount is required",
  }).positive("Amount must be greater than 0"),
  depositAccountId: z.number({
    required_error: "Deposit account is required",
  }),
  paymentMethod: z.string().default('bank_transfer'),
  note: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentLineItem = {
  transactionId: number;
  amount: number;
  selected: boolean;
};

export default function PaymentReceive() {
  const [match, params] = useRoute('/payment-receive/:id?');
  const existingTransactionId = params?.id ? parseInt(params.id) : undefined;
  const isEditMode = !!existingTransactionId;
  const [, setLocation] = useLocation();
  const navigate = (path: string) => setLocation(path);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form state
  const [initialCustomerId, setInitialCustomerId] = useState<number | null>(null);
  const [paymentLineItems, setPaymentLineItems] = useState<PaymentLineItem[]>([]);
  const [totalApplied, setTotalApplied] = useState(0);
  const [unappliedCredit, setUnappliedCredit] = useState(0);
  const [editModeInvoices, setEditModeInvoices] = useState<any[]>([]);
  
  // Form definition
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      reference: '',
      amount: 0,
      paymentMethod: 'bank_transfer',
      note: '',
    },
  });

  // Fetch existing payment data if in edit mode
  const { data: paymentData, isLoading: isPaymentDataLoading } = useQuery({
    queryKey: ['/api/payments', existingTransactionId],
    queryFn: async () => {
      if (!existingTransactionId) return null;
      const response = await fetch(`/api/payments/${existingTransactionId}`);
      return await response.json(); // The response is already the payment object
    },
    enabled: isEditMode,
  });
  
  // Populate form with existing payment data when in edit mode
  useEffect(() => {
    if (isEditMode && paymentData) {
      // Set form values from payment data
      form.setValue('contactId', paymentData.contactId);
      form.setValue('date', new Date(paymentData.date));
      form.setValue('reference', paymentData.reference || '');
      form.setValue('amount', paymentData.amount);
      form.setValue('depositAccountId', paymentData.depositAccountId);
      form.setValue('paymentMethod', paymentData.paymentMethod || 'bank_transfer'); // Default to bank_transfer if none is set
      form.setValue('note', paymentData.note || '');
      
      // Log the payment method for debugging
      console.log("Payment method from data:", paymentData.paymentMethod);
      
      // Set initial customer ID
      setInitialCustomerId(paymentData.contactId);
      
      // If the payment has line items, fetch the original invoices
      if (paymentData.lineItems && paymentData.lineItems.length > 0) {
        // Create line items from the payment data
        const items = paymentData.lineItems.map((item: any) => ({
          transactionId: item.transactionId,
          amount: item.amount || item.total, // Use total as fallback
          selected: true,
        }));
        setPaymentLineItems(items);
        
        // Calculate totals
        const applied = items.reduce((sum: number, item: PaymentLineItem) => sum + item.amount, 0);
        setTotalApplied(applied);
        setUnappliedCredit(paymentData.unappliedAmount || 0);
        
        // Fetch the original invoices to display in the table
        const fetchOriginalInvoices = async () => {
          try {
            const invoicePromises = paymentData.lineItems.map(async (item: any) => {
              if (!item.transactionId) return null;
              const response = await fetch(`/api/transactions/${item.transactionId}`);
              if (!response.ok) return null;
              const data = await response.json();
              
              // Return the transaction directly
              return data || null;
            });
            
            const invoices = await Promise.all(invoicePromises);
            // Filter out any null results
            const validInvoices = invoices.filter(Boolean);
            
            console.log("Fetched original invoices:", validInvoices);
            
            // Store the invoices for edit mode
            if (validInvoices.length > 0) {
              setEditModeInvoices(validInvoices);
            }
          } catch (error) {
            console.error("Failed to fetch original invoices:", error);
            toast({
              title: "Error",
              description: "Could not load the original invoices for this payment",
              variant: "destructive"
            });
          }
        };
        
        fetchOriginalInvoices();
      }
    }
  }, [isEditMode, paymentData, form, toast]);

  // Fetch contacts (customers only)
  const { data: allContacts, isLoading: isContactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
  });
  
  // Filter contacts to show only customers
  const contacts = Array.isArray(allContacts) 
    ? allContacts.filter((contact: any) => contact.type === 'customer') 
    : [];

  // Fetch accounts (for deposit accounts)
  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Filter for bank accounts and credit accounts
  const depositAccounts = Array.isArray(accounts)
    ? accounts.filter((account: any) => account.type === AccountType.BANK || account.type === AccountType.CREDIT)
    : [];
  
  // Set the customer ID in the form when initialCustomerId changes
  useEffect(() => {
    if (initialCustomerId) {
      form.setValue('contactId', initialCustomerId);
    }
  }, [initialCustomerId, form]);

  const watchContactId = form.watch("contactId");
  const watchAmount = form.watch("amount");

  // Fetch customer's invoices when contact changes
  const { data: customerInvoices, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['/api/transactions', { type: 'invoice', contactId: watchContactId }],
    queryFn: async () => {
      if (!watchContactId) return [];
      if (isEditMode) {
        // Don't fetch new invoices in edit mode - we'll use the line items from the payment data
        return [];
      }
      // Get all pending/overdue invoices
      const allInvoices = await apiRequest(`/api/transactions?type=invoice&status=pending,overdue`);
      // Filter by selected customer - ensure we only get invoices for this customer
      return allInvoices.filter((invoice: any) => invoice.contactId === watchContactId);
    },
    enabled: !!watchContactId && !isEditMode,
  });

  // Handle customer's invoices - different behavior for create vs edit mode
  useEffect(() => {
    if (!isEditMode && customerInvoices && customerInvoices.length > 0) {
      // In create mode, show all pending invoices
      const items = customerInvoices.map((invoice: any) => ({
        transactionId: invoice.id,
        amount: 0,
        selected: false,
      }));
      setPaymentLineItems(items);
    } else if (!isEditMode) {
      setPaymentLineItems([]);
    }
    // In edit mode, we don't use customerInvoices - we use the line items from the payment data
  }, [customerInvoices, isEditMode]);

  // Update totals when any value changes
  useEffect(() => {
    const applied = paymentLineItems.reduce((sum, item) => sum + (item.selected ? item.amount : 0), 0);
    setTotalApplied(applied);
    
    const unapplied = Math.max(0, (watchAmount || 0) - applied);
    setUnappliedCredit(unapplied);
  }, [paymentLineItems, watchAmount]);

  // Handle line item changes
  const handleLineItemChange = (index: number, field: 'amount' | 'selected', value: number | boolean) => {
    const updatedItems = [...paymentLineItems];
    
    if (field === 'amount' && typeof value === 'number') {
      // In edit mode, use the editModeInvoices for balance info
      if (isEditMode) {
        const invoice = editModeInvoices.find((inv: any) => inv.id === updatedItems[index].transactionId);
        // In edit mode, we can modify up to the original amount in edit mode
        updatedItems[index].amount = value;
      } else {
        // In create mode, use the customerInvoices for balance info
        const invoice = customerInvoices?.find((inv: any) => inv.id === updatedItems[index].transactionId);
        const maxAmount = invoice?.balance || invoice?.amount || 0;
        updatedItems[index].amount = Math.min(value, maxAmount);
      }
      
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
        if (isEditMode) {
          // In edit mode, use the original amount from the payment
          const invoice = editModeInvoices.find((inv: any) => inv.id === updatedItems[index].transactionId);
          const originalAmount = updatedItems[index].amount; // Keep the original amount 
          updatedItems[index].amount = originalAmount;
        } else {
          // When selected in create mode, auto-fill with the invoice balance
          const invoice = customerInvoices?.find((inv: any) => inv.id === updatedItems[index].transactionId);
          const invoiceBalance = invoice?.balance || invoice?.amount || 0;
          updatedItems[index].amount = invoiceBalance;
        }
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

  // Payment create mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/payments', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Received",
        description: "Payment has been successfully recorded",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });
  
  // Payment update mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/payments/${existingTransactionId}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Payment Updated",
        description: "The payment has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/income-statement'] });
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    // Only include selected line items
    const appliedItems = paymentLineItems
      .filter(item => item.selected && item.amount > 0)
      .map(item => ({
        transactionId: item.transactionId,
        amount: item.amount,
      }));
    
    // Check if applied amount exceeds received amount
    const totalAppliedAmount = appliedItems.reduce((sum, item) => sum + item.amount, 0);
    if (totalAppliedAmount > values.amount) {
      toast({
        title: "Error",
        description: "The amount applied to invoices cannot exceed the amount received.",
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
      lineItems: appliedItems,
      unappliedAmount: unappliedCredit,
    };
    
    // Use the appropriate mutation based on whether we're in edit mode
    if (isEditMode && existingTransactionId) {
      updatePaymentMutation.mutate(paymentData);
    } else {
      createPaymentMutation.mutate(paymentData);
    }
  };

  const isLoading = isContactsLoading || isAccountsLoading || createPaymentMutation.isPending || 
                  updatePaymentMutation.isPending || isPaymentDataLoading;

  return (
    <div className="py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Alert for editing existing payment */}
        {isEditMode && (
          <div className="mb-6 border border-blue-100 bg-blue-50 rounded-md p-4 flex items-start">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Payment details</h3>
              <p className="text-sm text-blue-700 mt-1">
                You're editing a payment transaction (ID: {existingTransactionId}).
                Update the details and click "Update Payment" to save your changes.
              </p>
            </div>
          </div>
        )}
        
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
            <h1 className="text-2xl font-semibold text-gray-900">{isEditMode ? 'Edit Payment' : 'Receive Payment'}</h1>
          </div>
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isLoading || !form.formState.isValid}
            className="bg-primary text-white"
          >
            {(createPaymentMutation.isPending || updatePaymentMutation.isPending) ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? 'Update Payment' : 'Record Payment'}
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
                          disabled={isContactsLoading || isEditMode}
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
                      <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm text-gray-500">
                        {contacts.find((c: any) => c.id === watchContactId)?.email || 'No email available'}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Payment Date</FormLabel>
                        <DatePicker 
                          date={field.value} 
                          setDate={field.onChange}
                        />
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
                          <Input placeholder="Check/Reference #" {...field} />
                        </FormControl>
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
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
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
                            {depositAccounts?.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.name}
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
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Memo / Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any notes about this payment" 
                              className="resize-none h-24"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Apply Payments Section */}
            {watchContactId && (
              <Card>
                <CardHeader>
                  <CardTitle>Apply Payment to Invoices</CardTitle>
                  {!isEditMode && watchAmount && watchAmount > 0 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAutoApply}
                    >
                      Auto Apply
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isEditMode && editModeInvoices && editModeInvoices.length > 0 ? (
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
                                Original Amount
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
                            {editModeInvoices.map((invoice: any, idx: number) => {
                              // Find the corresponding line item from our state
                              const lineItem = paymentLineItems.find(item => item.transactionId === invoice.id);
                              return (
                                <tr key={invoice.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <Checkbox
                                      id={`invoice-${invoice.id}`}
                                      checked={lineItem?.selected || false}
                                      onCheckedChange={(checked) => {
                                        const index = paymentLineItems.findIndex(item => item.transactionId === invoice.id);
                                        if (index !== -1) {
                                          handleLineItemChange(index, 'selected', !!checked);
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {invoice.reference || `INV-${invoice.id}`}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {invoice.date ? format(new Date(invoice.date), 'MMM dd, yyyy') : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.balance || invoice.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <input
                                      type="text"
                                      className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                      disabled={!lineItem?.selected}
                                      value={lineItem?.amount || 0}
                                      onChange={(e) => {
                                        // Update the UI immediately for calculations
                                        const tempValue = parseFloat(e.target.value);
                                        if (!isNaN(tempValue)) {
                                          const index = paymentLineItems.findIndex(item => item.transactionId === invoice.id);
                                          if (index !== -1) {
                                            handleLineItemChange(index, 'amount', tempValue);
                                          }
                                        }
                                      }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Payment Summary */}
                      <div className="mt-6 flex justify-end">
                        <div className="min-w-[240px] space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Applied:</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Amount Received:</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-1 mt-1">
                            <span className="font-medium">Unapplied Credit:</span>
                            <span className={`font-medium ${unappliedCredit > 0 ? 'text-blue-600' : ''}`}>
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !isEditMode && customerInvoices && customerInvoices.length > 0 ? (
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
                                Original Amount
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
                                  {invoice.date ? format(new Date(invoice.date), 'MMM dd, yyyy') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount)}
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
                      
                      {/* Payment Summary */}
                      <div className="mt-6 flex justify-end">
                        <div className="min-w-[240px] space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Applied:</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Amount Received:</span>
                            <span className="font-medium">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm border-t pt-1 mt-1">
                            <span className="font-medium">Unapplied Credit:</span>
                            <span className={`font-medium ${unappliedCredit > 0 ? 'text-blue-600' : ''}`}>
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No open invoices found for this customer.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}