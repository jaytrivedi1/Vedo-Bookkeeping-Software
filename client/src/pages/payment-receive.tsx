import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { 
  CreditCard, 
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
import { AccountType, Account, Contact, Transaction } from "@shared/schema";

const paymentSchema = z.object({
  contactId: z.coerce.number(),
  date: z.date(),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  reference: z.string().optional(),
  depositAccountId: z.coerce.number(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
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
  const [totalApplied, setTotalApplied] = useState(0);
  const [unappliedCredit, setUnappliedCredit] = useState(0);

  // Fetch contacts (customers only)
  const { data: allContacts, isLoading: isContactsLoading } = useQuery({
    queryKey: ['/api/contacts'],
  });
  
  // Filter contacts to show only customers
  const contacts = allContacts?.filter((contact: any) => 
    contact.type === 'customer'
  ) || [];

  // Fetch accounts (for deposit accounts)
  const { data: accounts, isLoading: isAccountsLoading } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Filter for bank accounts and credit accounts
  const depositAccounts = accounts?.filter(
    (account: any) => account.type === AccountType.BANK || account.type === AccountType.CREDIT
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
      // Get all pending/overdue invoices
      const allInvoices = await apiRequest(`/api/transactions?type=invoice&status=pending,overdue`);
      // Filter by selected customer - ensure we only get invoices for this customer
      return allInvoices.filter((invoice: any) => invoice.contactId === watchContactId);
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
      const maxAmount = invoice?.balance || 0;
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
    
    setPaymentLineItems(updatedItems);
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
      
      const paymentAmount = Math.min(invoice.balance, remainingAmount);
      updatedItems[itemIndex].amount = paymentAmount;
      updatedItems[itemIndex].selected = paymentAmount > 0;
      remainingAmount -= paymentAmount;
    }
    
    setPaymentLineItems(updatedItems);
  };

  // Payment creation mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/payments', {
        method: 'POST',
        data,
      } as any);
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

  const onSubmit = (values: PaymentFormValues) => {
    // Only include selected line items
    const appliedItems = paymentLineItems
      .filter(item => item.selected && item.amount > 0)
      .map(item => ({
        transactionId: item.transactionId,
        amount: item.amount,
      }));

    const selectedContact = contacts?.find((c: any) => c.id === values.contactId);
    
    const paymentData = {
      ...values,
      type: 'payment',
      status: 'completed',
      description: `Payment received from ${selectedContact?.name || 'customer'}`,
      lineItems: appliedItems,
      unappliedAmount: unappliedCredit,
    };
    
    paymentMutation.mutate(paymentData);
  };

  const isLoading = isContactsLoading || isAccountsLoading || paymentMutation.isPending;

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
            disabled={isLoading || !form.formState.isValid}
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
                          <Input 
                            type="number" 
                            step="0.01"
                            min="0"
                            {...field} 
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              field.onChange(target.value ? parseFloat(target.value) : 0);
                            }}
                            placeholder="0.00" 
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
                    <Button
                      type="button"
                      onClick={handleAutoApply}
                      variant="outline"
                      size="sm"
                      disabled={!watchAmount || watchAmount <= 0}
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
                  ) : customerInvoices && customerInvoices.length > 0 ? (
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
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={invoice.balance || invoice.amount}
                                    disabled={!paymentLineItems[idx]?.selected}
                                    value={paymentLineItems[idx]?.amount || 0}
                                    onInput={(e) => {
                                      const target = e.target as HTMLInputElement;
                                      const value = target.value ? parseFloat(target.value) : 0;
                                      handleLineItemChange(idx, 'amount', value);
                                    }}
                                    className="w-24"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 rounded-md bg-gray-50 p-4">
                        <div className="flex justify-between items-center text-sm">
                          <span>Total Received:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(watchAmount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span>Total Applied:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalApplied)}
                          </span>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex justify-between items-center font-medium">
                          <span>Unapplied Credit:</span>
                          <span className={unappliedCredit > 0 ? "text-green-600" : ""}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(unappliedCredit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription>
                        No open invoices found for this customer.
                      </AlertDescription>
                    </Alert>
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