import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Contact, SalesTax, Product, Account } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { CURRENCIES } from "@shared/currencies";
import { formatContactName } from "@/lib/currencyUtils";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import AddCustomerDialog from "@/components/dialogs/AddCustomerDialog";
import AddProductDialog from "@/components/dialogs/AddProductDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Line item schema
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().min(0, "Price must be positive"),
  amount: z.number(),
  salesTaxId: z.number().optional(),
  productId: z.string().optional(),
});

// Sales receipt schema
const salesReceiptSchema = z.object({
  date: z.date(),
  contactId: z.number().optional(),
  reference: z.string().min(1, "Receipt number is required"),
  paymentMethod: z.enum(["cash", "check", "credit_card", "bank_transfer", "other"]),
  depositAccountId: z.number({ required_error: "Deposit account is required" }),
  description: z.string().optional(),
  memo: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type SalesReceiptFormData = z.infer<typeof salesReceiptSchema>;

interface SalesReceiptFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function SalesReceiptForm({ onSuccess, onCancel }: SalesReceiptFormProps) {
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [currentLineItemIndex, setCurrentLineItemIndex] = useState<number | null>(null);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);
  const { toast } = useToast();

  // Generate default receipt number
  const today = new Date();
  const defaultReceiptNumber = `SR-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

  // Multi-currency state
  const [currency, setCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [watchContactId, setWatchContactId] = useState<number | undefined>(undefined);

  // Fetch data
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: salesTaxes = [] } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });

  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  // Filter for deposit accounts: bank, cash, credit card, line of credit, and undeposited funds
  const depositAccounts = accounts.filter((acc: Account) => 
    acc.type === 'bank' || 
    acc.type === 'credit_card' ||
    acc.type === 'other_current_liabilities' || // Includes line of credit
    acc.code === '1000' || // Cash account
    acc.name === 'Undeposited Funds'
  );

  // Transform data for SearchableSelect
  const customerItems: SearchableSelectItem[] = contacts
    .filter((contact: Contact) => contact.type === 'customer' || contact.type === 'both')
    .map((contact: Contact) => ({
      value: contact.id.toString(),
      label: formatContactName(contact.name, contact.currency, homeCurrency),
      subtitle: `· ${contact.type}`
    }));

  const taxItems: SearchableSelectItem[] = salesTaxes
    .filter((tax: SalesTax) => !tax.parentId)
    .map((tax: SalesTax) => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    }));

  const productItems: SearchableSelectItem[] = products.map((product: Product) => ({
    value: product.id.toString(),
    label: `${product.name} (${formatCurrency(typeof product.price === 'string' ? parseFloat(product.price) : product.price)})`,
    subtitle: undefined
  }));

  const depositAccountItems: SearchableSelectItem[] = depositAccounts.map((acc: Account) => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: acc.balance !== undefined ? `· ${formatCurrency(acc.balance)}` : undefined
  }));

  // Currency selector items
  const currencyItems: SearchableSelectItem[] = CURRENCIES.map((curr) => ({
    value: curr.code,
    label: `${curr.code} - ${curr.name}`,
    subtitle: curr.symbol ? `· ${curr.symbol}` : undefined
  }));

  const form = useForm<SalesReceiptFormData>({
    resolver: zodResolver(salesReceiptSchema),
    defaultValues: {
      date: today,
      contactId: undefined,
      reference: defaultReceiptNumber,
      paymentMethod: "cash",
      depositAccountId: undefined,
      description: '',
      memo: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Initialize currency to homeCurrency when preferences load
  useEffect(() => {
    if (homeCurrency) {
      setCurrency(homeCurrency);
    }
  }, [homeCurrency]);

  // Update currency when customer changes
  useEffect(() => {
    if (watchContactId && contacts && isMultiCurrencyEnabled) {
      const customer = contacts.find((c: Contact) => c.id === watchContactId);
      if (customer && customer.currency) {
        setCurrency(customer.currency);
      } else {
        setCurrency(homeCurrency);
      }
    }
  }, [watchContactId, contacts, isMultiCurrencyEnabled, homeCurrency]);

  // Keep currency in sync with homeCurrency when multi-currency is disabled
  useEffect(() => {
    if (!isMultiCurrencyEnabled && homeCurrency) {
      setCurrency(homeCurrency);
    }
  }, [isMultiCurrencyEnabled, homeCurrency]);

  // Watch for contact changes
  const watchedContactId = form.watch("contactId");
  useEffect(() => {
    if (watchedContactId) {
      setWatchContactId(watchedContactId);
    }
  }, [watchedContactId]);

  // Fetch exchange rate when currency or date changes
  const receiptDate = form.watch("date") || new Date();
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: currency, toCurrency: homeCurrency, date: receiptDate }],
    enabled: isMultiCurrencyEnabled && currency !== homeCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${currency}&toCurrency=${homeCurrency}&date=${format(receiptDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
        // If no exchange rate found, return null to show warning
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
    } else if (currency === homeCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, currency, homeCurrency]);

  // Function to recalculate totals
  const recalculateTotals = useCallback(() => {
    const currentLineItems = form.getValues("lineItems");
    let calculatedSubtotal = 0;
    let totalTaxAmount = 0;

    currentLineItems.forEach((item, index) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const itemAmount = roundTo2Decimals(quantity * unitPrice);
      
      // Update the amount in the form
      form.setValue(`lineItems.${index}.amount`, itemAmount, { shouldValidate: false });

      // Calculate tax for this line item
      if (item.salesTaxId) {
        const tax = salesTaxes.find((t: SalesTax) => t.id === item.salesTaxId);
        if (tax) {
          let itemTaxAmount: number;
          if (isExclusiveOfTax) {
            // Tax-exclusive: tax is added on top of the item amount
            itemTaxAmount = roundTo2Decimals(itemAmount * (tax.rate / 100));
            calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
          } else {
            // Tax-inclusive: item amount includes tax, need to extract it
            itemTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + tax.rate));
            calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTaxAmount));
          }
          totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
        }
      } else {
        // No tax on this line item - add full amount to subtotal
        calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
      }
    });

    // Total is always subtotal + tax
    const total = roundTo2Decimals(calculatedSubtotal + totalTaxAmount);

    setSubTotal(calculatedSubtotal);
    setTaxAmount(totalTaxAmount);
    setTotalAmount(total);
  }, [form, salesTaxes, isExclusiveOfTax]);

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
      // Just update the local state for this transaction
      setExchangeRate(pendingExchangeRate);
      toast({
        title: "Exchange rate updated",
        description: "The rate has been updated for this transaction only.",
      });
    } else {
      // Update the exchange rate in the database for all transactions on this date
      try {
        await apiRequest('/api/exchange-rates', 'PUT', {
          fromCurrency: currency,
          toCurrency: homeCurrency,
          date: format(receiptDate, 'yyyy-MM-dd'),
          rate: pendingExchangeRate,
        });

        setExchangeRate(pendingExchangeRate);
        
        // Invalidate exchange rate queries to refresh
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all ${currency} to ${homeCurrency} transactions on ${format(receiptDate, 'PPP')}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update exchange rate in database",
          variant: "destructive",
        });
      }
    }

    setPendingExchangeRate(null);
    setShowExchangeRateDialog(false);
  };

  const createSalesReceiptMutation = useMutation({
    mutationFn: async (data: SalesReceiptFormData) => {
      return await apiRequest('/api/sales-receipts', 'POST', {
        ...data,
        subTotal,
        taxAmount,
        totalAmount,
        currency,
        exchangeRate: currency !== homeCurrency ? exchangeRate : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Sales receipt created successfully",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales receipt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SalesReceiptFormData) => {
    createSalesReceiptMutation.mutate(data);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p: Product) => p.id === Number(productId));
    if (product) {
      form.setValue(`lineItems.${index}.description`, product.name);
      form.setValue(`lineItems.${index}.unitPrice`, typeof product.price === 'string' ? parseFloat(product.price) : product.price || 0);
      form.setValue(`lineItems.${index}.productId`, productId);
      
      // Set tax if product has default tax
      if (product.salesTaxId) {
        form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId);
      }
      
      // Recalculate totals after product selection
      recalculateTotals();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Receipt Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer */}
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Customer (Optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={customerItems}
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => {
                          field.onChange(value ? Number(value) : undefined);
                        }}
                        onAddNew={() => setShowAddCustomerDialog(true)}
                        addNewText="Add New Customer"
                        placeholder="Select customer (optional)"
                        searchPlaceholder="Search customers..."
                        emptyText="No customers found."
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                        data-testid="select-customer"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt Number */}
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Receipt Number *</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                        {...field}
                        data-testid="input-receipt-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-date"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {field.value ? format(field.value, "MMM dd, yyyy") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Method */}
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Method *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger
                          className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                          data-testid="select-payment-method"
                        >
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

              {/* Deposit To */}
              <FormField
                control={form.control}
                name="depositAccountId"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Deposit To *</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        items={depositAccountItems}
                        value={field.value?.toString() || ''}
                        onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                        placeholder="Select account"
                        searchPlaceholder="Search accounts..."
                        emptyText="No accounts found."
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                        data-testid="select-deposit-account"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency Selector - only show if multi-currency is enabled */}
              {isMultiCurrencyEnabled && (
                <FormItem className="md:col-span-1">
                  <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currency *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      items={currencyItems}
                      value={currency}
                      onValueChange={setCurrency}
                      placeholder="Select currency"
                      searchPlaceholder="Search currencies..."
                      emptyText="No currencies found."
                      disabled={!!watchContactId}
                      className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      data-testid="select-currency"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}

              {/* Exchange Rate Input - only show if currency is different from home currency */}
              {isMultiCurrencyEnabled && currency !== homeCurrency && (
                <div className="md:col-span-1">
                  <ExchangeRateInput
                    fromCurrency={currency}
                    toCurrency={homeCurrency}
                    value={exchangeRate}
                    onChange={handleExchangeRateChange}
                    isLoading={exchangeRateLoading}
                    date={receiptDate}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Line Items</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined })}
              className="bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl"
              data-testid="button-add-line-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="p-6 space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-start p-4 bg-slate-50 border border-slate-200 rounded-xl">
                {/* Product/Service */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Product/Service</label>
                  <SearchableSelect
                    items={productItems}
                    value={form.watch(`lineItems.${index}.productId`) || ''}
                    onValueChange={(value) => handleProductSelect(index, value)}
                    onAddNew={() => {
                      setCurrentLineItemIndex(index);
                      setShowAddProductDialog(true);
                    }}
                    addNewText="Add New Product/Service"
                    placeholder="Select product"
                    searchPlaceholder="Search products..."
                    emptyText="No products found"
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                  />
                </div>

                {/* Description */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Description *</label>
                  <Input
                    {...form.register(`lineItems.${index}.description`)}
                    placeholder="Item description"
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-3 md:col-span-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Qty *</label>
                  <Input
                    type="number"
                    step="0.01"
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    {...form.register(`lineItems.${index}.quantity`, {
                      valueAsNumber: true,
                      onChange: recalculateTotals
                    })}
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-3 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Price *</label>
                  <Input
                    type="number"
                    step="0.01"
                    className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                    {...form.register(`lineItems.${index}.unitPrice`, {
                      valueAsNumber: true,
                      onChange: recalculateTotals
                    })}
                  />
                </div>

                {/* Tax */}
                <div className="col-span-3 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Tax</label>
                  <Select
                    value={form.watch(`lineItems.${index}.salesTaxId`)?.toString() || ''}
                    onValueChange={(value) => {
                      form.setValue(`lineItems.${index}.salesTaxId`, value ? Number(value) : undefined);
                      recalculateTotals();
                    }}
                  >
                    <SelectTrigger className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg">
                      <SelectValue placeholder="Select Tax" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxItems.map(tax => (
                        <SelectItem key={tax.value} value={tax.value}>
                          {tax.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="col-span-2 md:col-span-1">
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Amount</label>
                  <Input
                    value={formatCurrency(form.watch(`lineItems.${index}.amount`) || 0)}
                    disabled
                    className="bg-slate-100 border-slate-200 h-10 rounded-lg text-slate-600"
                  />
                </div>

                {/* Delete Button */}
                {fields.length > 1 && (
                  <div className="col-span-1 flex items-end pb-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <div className="flex justify-end">
              <div className="w-full md:w-72 space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Tax:</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Memo */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Memo (Internal Note)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional note for internal reference..."
                      className="resize-none bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl min-h-[80px]"
                      rows={3}
                      {...field}
                      data-testid="textarea-memo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="bg-white border-slate-200 hover:bg-slate-50 rounded-xl px-6"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createSalesReceiptMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
            data-testid="button-submit"
          >
            {createSalesReceiptMutation.isPending ? "Saving..." : "Save Sales Receipt"}
          </Button>
        </div>
      </form>

      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onSuccess={(customerId) => {
          form.setValue('contactId', customerId);
          queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
        }}
      />

      <AddProductDialog
        open={showAddProductDialog}
        onOpenChange={setShowAddProductDialog}
        onSuccess={(product) => {
          if (currentLineItemIndex !== null) {
            // Set the product ID and populate the line item with the new product data
            form.setValue(`lineItems.${currentLineItemIndex}.productId`, product.id.toString());
            form.setValue(`lineItems.${currentLineItemIndex}.description`, product.name);
            form.setValue(`lineItems.${currentLineItemIndex}.unitPrice`, parseFloat(product.price.toString()));
            
            if (product.salesTaxId) {
              form.setValue(`lineItems.${currentLineItemIndex}.salesTaxId`, product.salesTaxId);
            }
            
            recalculateTotals();
            
            // Invalidate products query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          }
        }}
      />

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        fromCurrency={currency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={receiptDate}
        onConfirm={handleExchangeRateUpdate}
      />
    </Form>
  );
}
