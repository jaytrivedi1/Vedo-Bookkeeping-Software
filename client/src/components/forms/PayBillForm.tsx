import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Calculator, 
  CreditCard, 
  DollarSign, 
  Receipt, 
  CheckCircle2,
  AlertCircle,
  Banknote,
  Building2,
  Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DatePicker } from "@/components/ui/date-picker";
import { Contact, Transaction, Account } from "@shared/schema";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";

// Form validation schema
const payBillSchema = z.object({
  vendorId: z.coerce.number().min(1, "Please select a vendor"),
  paymentDate: z.date(),
  paymentMethod: z.string().min(1, "Please select a payment method"),
  paymentAccountId: z.coerce.number().min(1, "Please select a payment account"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  totalAmount: z.coerce.number().min(0, "Total amount cannot be negative"),
});

type PayBillFormValues = z.infer<typeof payBillSchema>;

interface BillPaymentItem {
  billId: number;
  billReference: string;
  billDate: string;
  dueDate?: string;
  originalAmount: number;
  outstandingBalance: number;
  paymentAmount: number;
  selected: boolean;
  vendor: string;
}

interface ChequePaymentItem {
  chequeId: number;
  chequeReference: string;
  chequeDate: string;
  availableCredit: number;
  appliedAmount: number;
  selected: boolean;
}

interface PayBillFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = [
  { value: "check", label: "Check", icon: Receipt },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "ach", label: "ACH Transfer", icon: Building2 },
  { value: "wire", label: "Wire Transfer", icon: Building2 },
];

export default function PayBillForm({ onSuccess, onCancel }: PayBillFormProps) {
  const { toast } = useToast();
  const [billItems, setBillItems] = useState<BillPaymentItem[]>([]);
  const [chequeItems, setChequeItems] = useState<ChequePaymentItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [totalSelected, setTotalSelected] = useState(0);
  const [totalChequeCredits, setTotalChequeCredits] = useState(0);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);

  // Form setup
  const form = useForm<PayBillFormValues>({
    resolver: zodResolver(payBillSchema),
    defaultValues: {
      paymentDate: new Date(),
      paymentMethod: "check",
      totalAmount: 0,
      referenceNumber: "",
      notes: "",
    }
  });

  // Calculate remaining amount to allocate
  const paymentAmount = form.watch('totalAmount') || 0;
  const remainingToAllocate = paymentAmount + totalChequeCredits - totalSelected;

  // Fetch vendors with outstanding bills
  const { data: vendors, isLoading: isLoadingVendors } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    select: (data: Contact[]) => data.filter(contact => 
      contact.type === 'vendor' || contact.type === 'both'
    ),
  });

  // Fetch all transactions to filter outstanding bills
  const { data: allTransactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch payment accounts (asset accounts for payments)
  const { data: allAccounts, isLoading: isLoadingAccounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    select: (data: Account[]) => data.filter(account => 
      account.type === 'bank' || account.type === 'current_assets' || (
        account.name.toLowerCase().includes('cash') ||
        account.name.toLowerCase().includes('bank') ||
        account.name.toLowerCase().includes('checking') ||
        account.name.toLowerCase().includes('savings')
      )
    ),
  });

  // Transform accounts into SearchableSelectItem format
  const accountItems: SearchableSelectItem[] = allAccounts?.map(account => ({
    value: account.id.toString(),
    label: `${account.name} (${account.code})`,
    subtitle: undefined
  })) || [];

  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });

  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  // Fetch all accounts (unfiltered) for currency lookup
  const { data: allAccountsUnfiltered } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Watch for payment account changes to detect foreign currency
  const paymentAccountId = form.watch("paymentAccountId");
  const paymentDate = form.watch("paymentDate") || new Date();
  
  // Detect foreign currency from selected payment account
  const selectedPaymentAccount = allAccountsUnfiltered?.find(acc => acc.id === paymentAccountId);
  const accountCurrency = selectedPaymentAccount?.currency || homeCurrency;
  const isForeignCurrency = accountCurrency !== homeCurrency && isMultiCurrencyEnabled;

  // Fetch exchange rate when foreign currency is detected
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: accountCurrency, toCurrency: homeCurrency, date: paymentDate }],
    enabled: isForeignCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${accountCurrency}&toCurrency=${homeCurrency}&date=${format(paymentDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch exchange rate');
      }
      return response.json();
    },
  });

  // Update exchange rate when exchange rate data changes
  useEffect(() => {
    if (exchangeRateData && exchangeRateData.rate) {
      setExchangeRate(parseFloat(exchangeRateData.rate));
    } else if (!isForeignCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, isForeignCurrency]);

  // Handle exchange rate changes from the ExchangeRateInput component
  const handleExchangeRateChange = (newRate: number, shouldUpdate: boolean) => {
    if (shouldUpdate) {
      setPendingExchangeRate(newRate);
      setShowExchangeRateDialog(true);
    } else {
      setExchangeRate(newRate);
    }
  };

  // Handle exchange rate update dialog confirmation
  const handleExchangeRateUpdate = async (scope: 'transaction_only' | 'all_on_date') => {
    if (pendingExchangeRate === null) return;

    if (scope === 'transaction_only') {
      setExchangeRate(pendingExchangeRate);
      toast({
        title: "Exchange rate updated",
        description: "The rate has been updated for this transaction only.",
      });
    } else {
      try {
        await apiRequest('/api/exchange-rates', 'PUT', {
          fromCurrency: accountCurrency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(paymentDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all transactions on ${format(paymentDate, 'PPP')}.`,
        });
      } catch (error: any) {
        toast({
          title: "Error updating exchange rate",
          description: error?.message || "Failed to update exchange rate in database.",
          variant: "destructive",
        });
      }
    }
    
    setPendingExchangeRate(null);
    setShowExchangeRateDialog(false);
  };

  // Fetch vendor's unapplied cheques (unapplied credits)
  const { data: vendorCheques, isLoading: isLoadingCheques } = useQuery({
    queryKey: ['/api/transactions', { type: 'cheque', contactId: selectedVendorId }],
    queryFn: async () => {
      if (!selectedVendorId) return [];
      const allTransactions = await apiRequest(`/api/transactions`);
      return allTransactions.filter((transaction: any) => 
        transaction.type === 'cheque' && 
        transaction.contactId === selectedVendorId &&
        transaction.status === 'unapplied_credit' &&
        (transaction.balance || 0) > 0
      );
    },
    enabled: !!selectedVendorId,
  });

  // Filter outstanding bills for selected vendor
  useEffect(() => {
    if (selectedVendorId && allTransactions && vendors) {
      const vendor = vendors.find(v => v.id === selectedVendorId);
      const outstandingBills = allTransactions
        .filter(transaction => 
          transaction.type === 'bill' && 
          transaction.contactId === selectedVendorId &&
          (transaction.balance || 0) > 0
        )
        .map(bill => ({
          billId: bill.id,
          billReference: bill.reference || `BILL-${bill.id}`,
          billDate: format(new Date(bill.date), 'yyyy-MM-dd'),
          dueDate: undefined, // Due date not available in Transaction schema
          originalAmount: bill.amount,
          outstandingBalance: bill.balance || 0,
          paymentAmount: 0,
          selected: false,
          vendor: vendor?.name || 'Unknown Vendor'
        }));

      setBillItems(outstandingBills);
    } else {
      setBillItems([]);
    }
  }, [selectedVendorId, allTransactions, vendors]);

  // Initialize cheque items when vendor cheques change
  useEffect(() => {
    if (vendorCheques && vendorCheques.length > 0) {
      const items = vendorCheques.map((cheque: any) => ({
        chequeId: cheque.id,
        chequeReference: cheque.reference || `CHQ-${cheque.id}`,
        chequeDate: format(new Date(cheque.date), 'yyyy-MM-dd'),
        availableCredit: cheque.balance || 0,
        appliedAmount: 0,
        selected: false,
      }));
      setChequeItems(items);
    } else {
      setChequeItems([]);
    }
  }, [vendorCheques]);

  // Update bill payment amount
  const updateBillPayment = (billId: number, amount: number) => {
    setBillItems(prev => {
      return prev.map(item => {
        if (item.billId === billId) {
          // Allow free input when no payment amount is set, otherwise constrain to remaining allocation
          let maxAllowable = amount;
          
          const totalAvailable = paymentAmount + totalChequeCredits;
          if (totalAvailable > 0) {
            const currentTotal = prev
              .filter(otherItem => otherItem.billId !== billId && otherItem.selected)
              .reduce((sum, otherItem) => sum + otherItem.paymentAmount, 0);
            
            maxAllowable = Math.min(
              amount,
              item.outstandingBalance,
              totalAvailable - currentTotal
            );
          } else {
            // When no payment amount is set, only constrain to outstanding balance
            maxAllowable = Math.min(amount, item.outstandingBalance);
          }
          
          return { ...item, paymentAmount: Math.max(0, maxAllowable) };
        }
        return item;
      });
    });
  };

  // Toggle bill selection
  const toggleBillSelection = (billId: number, selected: boolean) => {
    setBillItems(prev => prev.map(item => 
      item.billId === billId 
        ? { 
            ...item, 
            selected,
            paymentAmount: 0  // User will manually set payment amounts
          }
        : item
    ));
  };

  // Toggle cheque selection
  const toggleChequeSelection = (chequeId: number, selected: boolean) => {
    setChequeItems(prev => prev.map(item => 
      item.chequeId === chequeId 
        ? { ...item, selected, appliedAmount: 0 }
        : item
    ));
  };

  // Update cheque applied amount
  const updateChequeAmount = (chequeId: number, amount: number) => {
    setChequeItems(prev => prev.map(item => {
      if (item.chequeId === chequeId) {
        const maxAllowable = Math.min(amount, item.availableCredit);
        return { ...item, appliedAmount: Math.max(0, maxAllowable) };
      }
      return item;
    }));
  };

  // Calculate totals and remaining to allocate
  useEffect(() => {
    const total = billItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.paymentAmount, 0);
    setTotalSelected(total);
    
    const chequeTotal = chequeItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + item.appliedAmount, 0);
    setTotalChequeCredits(chequeTotal);
  }, [billItems, chequeItems]);

  // Allocate remaining payment across selected bills
  const allocateRemaining = () => {
    if (remainingToAllocate <= 0) return;
    
    const selectedBills = billItems.filter(item => item.selected);
    if (selectedBills.length === 0) return;
    
    const totalAvailable = paymentAmount + totalChequeCredits;
    setBillItems(prev => prev.map(item => {
      if (!item.selected) return item;
      
      const remainingAfterOthers = totalAvailable - prev
        .filter(other => other.billId !== item.billId && other.selected)
        .reduce((sum, other) => sum + other.paymentAmount, 0);
      
      const allocatedAmount = Math.min(
        item.outstandingBalance,
        remainingAfterOthers / selectedBills.length
      );
      
      return { ...item, paymentAmount: allocatedAmount };
    }));
  };

  // Pay all outstanding bills (select all and allocate payment amount across them)
  const payAllSelected = () => {
    setBillItems(prev => {
      const allSelected = prev.map(item => ({ ...item, selected: true }));
      const totalOutstanding = allSelected.reduce((sum, item) => sum + item.outstandingBalance, 0);
      
      const totalAvailable = paymentAmount + totalChequeCredits;
      if (totalAvailable === 0) {
        // If no payment amount or cheques set, use total outstanding
        form.setValue('totalAmount', totalOutstanding);
        return allSelected.map(item => ({ ...item, paymentAmount: item.outstandingBalance }));
      } else {
        // Allocate available funds (payment + cheques) proportionally
        return allSelected.map(item => ({
          ...item,
          paymentAmount: Math.min(
            item.outstandingBalance,
            (item.outstandingBalance / totalOutstanding) * totalAvailable
          )
        }));
      }
    });
  };

  // Clear all selections
  const clearAllSelections = () => {
    setBillItems(prev => prev.map(item => ({
      ...item,
      selected: false,
      paymentAmount: 0
    })));
    setChequeItems(prev => prev.map(item => ({
      ...item,
      selected: false,
      appliedAmount: 0
    })));
  };

  // Submit payment
  const payBillMutation = useMutation({
    mutationFn: async (data: PayBillFormValues) => {
      const selectedBills = billItems.filter(item => item.selected && item.paymentAmount > 0);
      const selectedCheques = chequeItems.filter(item => item.selected && item.appliedAmount > 0);
      
      if (selectedBills.length === 0) {
        throw new Error("Please select at least one bill to pay");
      }

      return apiRequest('/api/payments/pay-bills', 'POST', {
        ...data,
        bills: selectedBills.map(bill => ({
          billId: bill.billId,
          amount: bill.paymentAmount
        })),
        cheques: selectedCheques.map(cheque => ({
          chequeId: cheque.chequeId,
          amount: cheque.appliedAmount
        }))
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bill payment processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to process payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PayBillFormValues) => {
    payBillMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const isLoading = isLoadingVendors || isLoadingTransactions || isLoadingAccounts;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Payment Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Details
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vendor</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedVendorId(parseInt(value));
                      }}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map(vendor => (
                          <SelectItem key={vendor.id} value={vendor.id.toString()}>
                            {vendor.name}
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
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Date</FormLabel>
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
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map(method => {
                          const Icon = method.icon;
                          return (
                            <SelectItem key={method.value} value={method.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {method.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pay From Account</FormLabel>
                    <SearchableSelect
                      items={accountItems}
                      value={field.value?.toString()}
                      onValueChange={field.onChange}
                      placeholder="Select account"
                      searchPlaceholder="Search accounts..."
                      emptyText={isLoadingAccounts ? "Loading accounts..." : "No accounts found."}
                      disabled={isLoadingAccounts}
                      className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      onAddNew={() => setAddAccountOpen(true)}
                      addNewText="Add New Account"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isForeignCurrency && (
                <div className="md:col-span-2 lg:col-span-1 bg-blue-50 p-4 rounded-xl">
                  <ExchangeRateInput
                    fromCurrency={accountCurrency}
                    toCurrency={homeCurrency}
                    value={exchangeRate}
                    onChange={handleExchangeRateChange}
                    isLoading={exchangeRateLoading}
                    date={paymentDate}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reference Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Check #, confirmation #, etc."
                        {...field}
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-400">
                      Optional reference number for this payment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-slate-400">
                      Total amount being paid to the vendor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2 lg:col-span-1">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        {...field}
                        className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Outstanding Bills Card */}
          {selectedVendorId && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Outstanding Bills
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Select bills to pay for {vendors?.find(v => v.id === selectedVendorId)?.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={allocateRemaining}
                      disabled={billItems.filter(item => item.selected).length === 0 || remainingToAllocate <= 0}
                      className="border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Allocate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={payAllSelected}
                      disabled={billItems.length === 0}
                      className="border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Pay All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                      disabled={billItems.length === 0}
                      className="border-slate-300 text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {isLoadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-slate-500">Loading bills...</p>
                    </div>
                  </div>
                ) : billItems.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-lg font-medium text-slate-900">No Outstanding Bills</p>
                    <p className="text-slate-500">This vendor has no unpaid bills.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 border-b border-slate-200">
                            <TableHead className="w-12 text-xs font-medium text-slate-500 uppercase tracking-wide">Pay</TableHead>
                            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">Bill #</TableHead>
                            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</TableHead>
                            <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due Date</TableHead>
                            <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Original Amount</TableHead>
                            <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Outstanding</TableHead>
                            <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billItems.map((bill) => (
                            <TableRow key={bill.billId} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <TableCell>
                                <Checkbox
                                  checked={bill.selected}
                                  onCheckedChange={(checked) =>
                                    toggleBillSelection(bill.billId, checked as boolean)
                                  }
                                />
                              </TableCell>
                              <TableCell className="font-medium text-slate-900">
                                {bill.billReference}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {format(new Date(bill.billDate), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell className="text-slate-700">
                                {bill.dueDate ? (
                                  <div>
                                    {format(new Date(bill.dueDate), 'MMM dd, yyyy')}
                                    {new Date(bill.dueDate) < new Date() && (
                                      <Badge variant="destructive" className="ml-2 text-xs">
                                        Overdue
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell className="text-right text-slate-700">
                                {formatCurrency(bill.originalAmount)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-900">
                                {formatCurrency(bill.outstandingBalance)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={bill.outstandingBalance}
                                  value={bill.paymentAmount || ''}
                                  onChange={(e) => {
                                    const rawValue = e.target.value;
                                    const amount = rawValue === '' ? 0 : parseFloat(rawValue);

                                    // Update bill payment amount directly without constraints during typing
                                    setBillItems(prev => prev.map(item =>
                                      item.billId === bill.billId
                                        ? {
                                            ...item,
                                            paymentAmount: isNaN(amount) ? 0 : amount,
                                            selected: amount > 0
                                          }
                                        : item
                                    ));
                                  }}
                                  className="w-24 text-right bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Separator className="my-4" />

                    {/* Payment Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">Payment Amount:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(paymentAmount)}</span>
                      </div>
                      {totalChequeCredits > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-slate-700">Cheque Credits:</span>
                          <span className="font-semibold text-green-600">{formatCurrency(totalChequeCredits)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-slate-700">Allocated to Bills:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(totalSelected)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg border-t border-slate-200 pt-2 mt-2">
                        <span className="font-semibold text-slate-900">Remaining to Allocate:</span>
                        <span className={`font-bold ${
                          remainingToAllocate > 0 ? 'text-orange-600' :
                          remainingToAllocate < 0 ? 'text-red-600' :
                          'text-green-600'
                        }`}>
                          {formatCurrency(remainingToAllocate)}
                        </span>
                      </div>
                      {billItems.filter(item => item.selected).length > 0 && (
                        <p className="text-sm text-slate-500">
                          Paying {billItems.filter(item => item.selected).length} bill(s)
                        </p>
                      )}

                      {/* Validation Messages */}
                      {paymentAmount > 0 && Math.abs(remainingToAllocate) > 0.001 && (
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-orange-600">
                            {remainingToAllocate > 0
                              ? `You need to allocate ${formatCurrency(remainingToAllocate)} more`
                              : `You have over-allocated by ${formatCurrency(Math.abs(remainingToAllocate))}`
                            }
                          </span>
                        </div>
                      )}

                      {paymentAmount === 0 && (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <AlertCircle className="h-4 w-4" />
                          <span>Enter a payment amount to begin</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Unapplied Cheques Card */}
          {selectedVendorId && chequeItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Available Unapplied Cheques
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Apply existing cheque credits to these bills
                </p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="w-12 text-xs font-medium text-slate-500 uppercase tracking-wide">Apply</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cheque #</TableHead>
                        <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Available Credit</TableHead>
                        <TableHead className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide">Apply Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chequeItems.map((cheque) => (
                        <TableRow key={cheque.chequeId} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <TableCell>
                            <Checkbox
                              checked={cheque.selected}
                              onCheckedChange={(checked) =>
                                toggleChequeSelection(cheque.chequeId, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {cheque.chequeReference}
                          </TableCell>
                          <TableCell className="text-slate-700">
                            {format(new Date(cheque.chequeDate), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-900">
                            {formatCurrency(cheque.availableCredit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max={cheque.availableCredit}
                              value={cheque.appliedAmount || ''}
                              disabled={!cheque.selected}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                const amount = rawValue === '' ? 0 : parseFloat(rawValue);
                                updateChequeAmount(cheque.chequeId, isNaN(amount) ? 0 : amount);
                              }}
                              className="w-24 text-right bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalChequeCredits > 0 && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-900">Total Cheque Credits Applied:</span>
                      <span className="font-bold text-green-900">{formatCurrency(totalChequeCredits)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                payBillMutation.isPending ||
                (paymentAmount === 0 && totalChequeCredits === 0) ||
                totalSelected === 0 ||
                Math.abs(remainingToAllocate) > 0.001  // Allow for floating point precision
              }
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6 min-w-32"
            >
              {payBillMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay {formatCurrency(totalSelected)}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      
      <AddAccountDialog
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onAccountCreated={(accountId) => {
          form.setValue("paymentAccountId", accountId);
        }}
      />

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        onConfirm={handleExchangeRateUpdate}
        fromCurrency={accountCurrency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={paymentDate}
      />
    </div>
  );
}

