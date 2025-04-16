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
  Loader2,
  AlertCircle
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AccountType } from "@shared/schema";

// Define the form schema for payment
const paymentSchema = z.object({
  contactId: z.number({
    required_error: "Please select a customer",
  }),
  date: z.date({
    required_error: "Please select a date",
  }),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  depositAccountId: z.number({
    required_error: "Please select a deposit account",
  }),
  amount: z.number({
    required_error: "Please enter an amount",
  }).min(0.01, "Amount must be greater than 0"),
  note: z.string().optional(),
});

// Define types
type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentLineItem = {
  transactionId: number;
  amount: number;
  selected: boolean;
};

export default function PaymentReceive() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Payment line items and related state
  const [paymentLineItems, setPaymentLineItems] = useState<PaymentLineItem[]>([]);
  const [totalApplied, setTotalApplied] = useState(0);
  const [unappliedCredit, setUnappliedCredit] = useState(0);
  const [initialCustomerId, setInitialCustomerId] = useState<number | null>(null);
  const [editModeInvoices, setEditModeInvoices] = useState<any[]>([]);
  
  // State for transaction ID when user clicks on an existing payment
  const [existingTransactionId, setExistingTransactionId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoadingExistingPayment, setIsLoadingExistingPayment] = useState(false);
  
  // Create form
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      contactId: undefined,
      date: new Date(),
      paymentMethod: "",
      reference: "",
      amount: 0,
      note: "",
    },
  });
  
  // Check URL for customer ID and transaction ID parameters
  useEffect(() => {
    // Parse query string for customerId and transactionId
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customerId');
    const transactionId = params.get('transactionId');
    
    if (customerId) {
      const id = parseInt(customerId);
      if (!isNaN(id)) {
        setInitialCustomerId(id);
      }
    }
    
    if (transactionId) {
      const id = parseInt(transactionId);
      if (!isNaN(id)) {
        setExistingTransactionId(id);
        setIsEditMode(true);
        // We'll load the payment data in a separate effect
      }
    }
  }, []);
  
  // Fetch existing payment data when in edit mode
  const { data: paymentData, isLoading: isPaymentDataLoading } = useQuery({
    queryKey: ['/api/payments', existingTransactionId],
    queryFn: async () => {
      if (!existingTransactionId) return null;
      setIsLoadingExistingPayment(true);
      try {
        const result = await apiRequest(`/api/payments/${existingTransactionId}`);
        setIsLoadingExistingPayment(false);
        return result;
      } catch (error) {
        console.error("Error fetching payment:", error);
        setIsLoadingExistingPayment(false);
        return null;
      }
    },
    enabled: isEditMode && existingTransactionId !== null,
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
      form.setValue('paymentMethod', paymentData.paymentMethod || '');
      form.setValue('note', paymentData.note || '');
      
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
              return await response.json();
            });
            
            const invoices = await Promise.all(invoicePromises);
            // Filter out any null results
            const validInvoices = invoices.filter(Boolean);
            
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
      // Get all pending/overdue invoices
      const allInvoices = await apiRequest(`/api/transactions?type=invoice&status=pending,overdue`);
      // Filter by selected customer - ensure we only get invoices for this customer
      return allInvoices.filter((invoice: any) => invoice.contactId === watchContactId);
    },
    enabled: !!watchContactId,
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

            {/* Apply Payment Section */}
            {watchContactId && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Apply Payment to Invoices</CardTitle>
                    {!isEditMode && (
                      <Button
                        type="button"
                        onClick={handleAutoApply}
                        variant="outline"
                        size="sm"
                        disabled={!watchAmount || watchAmount <= 0}
                      >
                        Auto Apply
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isInvoicesLoading || (isEditMode && isPaymentDataLoading) ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : isEditMode && editModeInvoices.length > 0 ? (
                    // In edit mode, show invoices from the original payment
                    <div>
                      <div className="rounded-md border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
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
                                Amount Paid
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {editModeInvoices.map((invoice: any, idx: number) => {
                              // Find the corresponding line item with payment amount
                              const lineItem = paymentLineItems.find(item => item.transactionId === invoice.id);
                              return (
                                <tr key={invoice.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {invoice.reference || `INV-${invoice.id}`}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(invoice.date), 'MMM dd, yyyy')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : 'N/A'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(invoice.amount)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(lineItem?.amount || 0)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Payment Summary */}
                      <div className="mt-6 text-right">
                        <div className="text-sm text-gray-500">Total Applied: 
                          <span className="ml-2 font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">Amount Received: 
                          <span className="ml-2 font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                          </span>
                        </div>
                        <div className="text-sm font-medium">Unapplied Credit: 
                          <span className={`ml-2 ${unappliedCredit > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                          </span>
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
                                  {format(new Date(invoice.date), 'MMM dd, yyyy')}
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
                      <div className="mt-6 text-right">
                        <div className="text-sm text-gray-500">Total Applied: 
                          <span className="ml-2 font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">Amount Received: 
                          <span className="ml-2 font-medium text-gray-900">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                          </span>
                        </div>
                        <div className="text-sm font-medium">Unapplied Credit: 
                          <span className={`ml-2 ${unappliedCredit > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                          </span>
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