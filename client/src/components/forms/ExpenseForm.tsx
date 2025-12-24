import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { expenseSchema, Contact, SalesTax, Account, Transaction } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { validateAccountContactRequirement, hasAccountsPayableOrReceivable } from "@/lib/accountValidation";
import { CURRENCIES } from "@shared/currencies";
import { formatContactName } from "@/lib/currencyUtils";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import AddVendorDialog from "@/components/dialogs/AddVendorDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";
import { CalendarIcon, Plus, Trash2, XIcon, Upload } from "lucide-react";

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

interface FormLineItem {
  accountId?: number;
  description: string;
  amount: number;
  salesTaxId?: number;
}

interface Expense {
  date: Date;
  contactId?: number;
  reference?: string;
  description?: string;
  status: "open" | "completed" | "cancelled";
  paymentMethod?: "cash" | "check" | "credit_card" | "bank_transfer" | "other";
  paymentAccountId: number;
  paymentDate?: Date;
  memo?: string;
  lineItems: FormLineItem[];
  subTotal?: number;
  taxAmount?: number;
  totalAmount?: number;
}

interface TaxComponentInfo {
  id: number;
  name: string;
  rate: number;
  amount: number;
  isComponent: boolean;
  parentId?: number;
}

interface ExpenseFormType extends UseFormReturn<Expense> {
  taxComponentsInfo?: TaxComponentInfo[];
}

interface ExpenseFormProps {
  expense?: Transaction;
  lineItems?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseForm({ expense, lineItems, onSuccess, onCancel }: ExpenseFormProps) {
  const isEditing = Boolean(expense);
  const initialDate = isEditing ? new Date(expense!.date) : new Date();
  const initialPaymentDate = isEditing && expense!.paymentDate ? new Date(expense!.paymentDate) : new Date();
  
  const [subTotal, setSubTotal] = useState(isEditing ? (expense?.subTotal || expense?.amount || 0) : 0);
  const [taxAmount, setTaxAmount] = useState(isEditing ? (expense?.taxAmount || 0) : 0);
  const [manualTaxAmount, setManualTaxAmount] = useState<number | null>(isEditing && expense?.taxAmount !== undefined ? expense.taxAmount : null);
  const [totalAmount, setTotalAmount] = useState(isEditing ? (expense?.amount || 0) : 0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [manualComponentAmounts, setManualComponentAmounts] = useState<Record<number, number>>({});
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  const [accountDialogContext, setAccountDialogContext] = useState<{type: 'payment' | 'lineItem', index?: number} | null>(null);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const { toast } = useToast();

  // Multi-currency state
  const [currency, setCurrency] = useState<string>(expense?.currency || 'USD');
  const [exchangeRate, setExchangeRate] = useState<number>(expense?.exchangeRate ? parseFloat(expense.exchangeRate) : 1);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);

  const defaultExpenseNumber = isEditing ? expense?.reference : "";  // Allow blank reference numbers

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Transform sales taxes for SearchableSelect (filter main taxes only)
  const taxItems: SearchableSelectItem[] = salesTaxes?.filter(tax => !tax.parentId).map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined
  })) || [];
  
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });

  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  const payees = contacts || [];
  const allAccounts = accounts?.filter(account => account.code !== '3999') || [];
  const paymentAccounts = accounts?.filter(account => 
    account.type === 'bank' || account.type === 'credit_card'
  ) || [];

  // Transform contacts into SearchableSelectItem format
  const contactItems: SearchableSelectItem[] = contacts?.map(contact => ({
    value: contact.id.toString(),
    label: formatContactName(contact.name, contact.currency, homeCurrency),
    subtitle: `· ${contact.type}`
  })) || [];

  // Transform payment accounts into SearchableSelectItem format
  const paymentAccountItems: SearchableSelectItem[] = paymentAccounts.map(account => ({
    value: account.id.toString(),
    label: `${account.name} (${account.type})`,
    subtitle: undefined
  }));

  // Transform all accounts into SearchableSelectItem format
  const allAccountItems: SearchableSelectItem[] = allAccounts.map(account => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  // Transform payment methods into SearchableSelectItem format
  const paymentMethodItems: SearchableSelectItem[] = [
    { value: "cash", label: "Cash", subtitle: undefined },
    { value: "check", label: "Check", subtitle: undefined },
    { value: "credit_card", label: "Credit Card", subtitle: undefined },
    { value: "bank_transfer", label: "Bank Transfer", subtitle: undefined },
    { value: "other", label: "Other", subtitle: undefined }
  ];

  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: isEditing ? {
      date: initialDate,
      contactId: expense?.contactId || undefined,
      reference: expense?.reference || '',
      description: expense?.description || '',
      status: 'completed' as const,
      paymentMethod: (expense?.paymentMethod as "cash" | "check" | "credit_card" | "bank_transfer" | "other") || 'cash',
      paymentAccountId: expense?.paymentAccountId || undefined,
      paymentDate: initialPaymentDate,
      memo: expense?.memo || '',
      lineItems: lineItems?.length ? lineItems.map(item => ({
        accountId: item.accountId || undefined,
        description: item.description,
        amount: item.amount,
        salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
      })) : [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
    } : {
      date: initialDate,
      contactId: undefined,
      reference: defaultExpenseNumber || '',
      description: '',
      status: 'completed' as const,
      paymentMethod: undefined,
      paymentAccountId: undefined,
      paymentDate: initialPaymentDate,
      memo: '',
      lineItems: [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
    },
  }) as ExpenseFormType;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Watch for payment account changes to detect foreign currency
  const paymentAccountId = form.watch("paymentAccountId");
  const contactId = form.watch("contactId");
  const expenseDate = form.watch("paymentDate") || form.watch("date") || new Date();
  
  // Detect foreign currency from selected payment account
  const selectedPaymentAccount = accounts?.find(acc => acc.id === paymentAccountId);
  const accountCurrency = selectedPaymentAccount?.currency || homeCurrency;
  
  // Also check vendor currency if a vendor is selected
  const selectedVendor = contacts?.find(c => c.id === contactId);
  const vendorCurrency = selectedVendor?.currency || null;
  
  // Determine the effective currency: prefer account currency if it's foreign, otherwise use vendor currency
  const effectiveCurrency = accountCurrency !== homeCurrency ? accountCurrency : (vendorCurrency || homeCurrency);
  const isForeignCurrency = effectiveCurrency !== homeCurrency && isMultiCurrencyEnabled;
  
  // Sync currency state with effective currency
  useEffect(() => {
    if (isMultiCurrencyEnabled && !isEditing) {
      setCurrency(effectiveCurrency);
    }
  }, [effectiveCurrency, isMultiCurrencyEnabled, isEditing]);

  // Fetch exchange rate when currency or date changes
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: currency, toCurrency: homeCurrency, date: expenseDate }],
    enabled: isMultiCurrencyEnabled && currency !== homeCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${currency}&toCurrency=${homeCurrency}&date=${format(expenseDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch exchange rate');
      }
      return response.json();
    },
  });

  // Initialize currency to homeCurrency when preferences load
  useEffect(() => {
    if (homeCurrency && !isEditing && !expense?.currency) {
      setCurrency(homeCurrency);
    }
  }, [homeCurrency, isEditing, expense?.currency]);

  // Keep currency in sync with homeCurrency when multi-currency is disabled
  useEffect(() => {
    if (!isMultiCurrencyEnabled && homeCurrency && !isEditing) {
      setCurrency(homeCurrency);
    }
  }, [isMultiCurrencyEnabled, homeCurrency, isEditing]);

  // Update exchange rate when exchange rate data changes
  useEffect(() => {
    if (exchangeRateData && exchangeRateData.rate) {
      setExchangeRate(parseFloat(exchangeRateData.rate));
    } else if (currency === homeCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, currency, homeCurrency]);

  useEffect(() => {
    if (isEditing && lineItems?.length && expense) {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxTotal = (expense.amount || 0) - subtotal;
      
      setSubTotal(subtotal);
      setTaxAmount(taxTotal);
      setTotalAmount(expense.amount || 0);
    }
  }, [isEditing, lineItems, expense]);

  // Reset form when expense data loads (fixes empty form on navigation)
  useEffect(() => {
    if (isEditing && expense && lineItems) {
      form.reset({
        date: new Date(expense.date),
        contactId: expense.contactId || undefined,
        reference: expense.reference || '',
        description: expense.description || '',
        status: 'completed' as const,
        paymentMethod: (expense.paymentMethod as "cash" | "check" | "credit_card" | "bank_transfer" | "other") || 'cash',
        paymentAccountId: expense.paymentAccountId || undefined,
        paymentDate: expense.paymentDate ? new Date(expense.paymentDate) : new Date(expense.date),
        memo: expense.memo || '',
        lineItems: lineItems.length ? lineItems.map(item => ({
          accountId: item.accountId || undefined,
          description: item.description,
          amount: item.amount,
          salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
        })) : [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
      });
    }
  }, [expense, lineItems, isEditing, form]);

  const saveExpense = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        console.log("Updating expense with data:", JSON.stringify(data, null, 2));
        return await apiRequest(`/api/transactions/${expense?.id}`, 'PATCH', data);
      } else {
        console.log("Creating expense with data:", JSON.stringify(data, null, 2));
        return await apiRequest('/api/expenses', 'POST', data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Expense saved",
        description: "Expense has been saved successfully",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error: any) => {
      console.error("Error saving expense:", error);
      toast({
        title: "Error saving expense",
        description: error?.message || "There was a problem saving the expense. Please try again.",
        variant: "destructive",
      });
    }
  });

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
          rate: pendingExchangeRate,
          date: format(expenseDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        
        // Invalidate exchange rate queries to refresh the data
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all transactions on ${format(expenseDate, 'PPP')}.`,
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

  const calculateTotals = (manualTaxOverride?: number | null) => {
    const lineItems = form.getValues('lineItems');
    
    let calculatedSubtotal = 0;
    let totalTaxAmount = 0;
    const taxComponents = new Map<number, TaxComponentInfo>();
    const usedTaxes = new Map<number, SalesTax>();
    
    lineItems.forEach((item) => {
      const itemAmount = item.amount || 0;
      
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            if (components.length > 0) {
              let itemTotalTax = 0;
              components.forEach(component => {
                let componentTaxAmount: number;
                if (isExclusiveOfTax) {
                  componentTaxAmount = roundTo2Decimals(itemAmount * (component.rate / 100));
                } else {
                  componentTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + component.rate));
                }
                itemTotalTax = roundTo2Decimals(itemTotalTax + componentTaxAmount);
                totalTaxAmount = roundTo2Decimals(totalTaxAmount + componentTaxAmount);
                
                const existingComponent = taxComponents.get(component.id);
                if (existingComponent) {
                  existingComponent.amount = roundTo2Decimals(existingComponent.amount + componentTaxAmount);
                  taxComponents.set(component.id, existingComponent);
                } else {
                  taxComponents.set(component.id, {
                    id: component.id,
                    name: component.name,
                    rate: component.rate,
                    amount: componentTaxAmount,
                    isComponent: true,
                    parentId: salesTax.id
                  });
                }
              });
              
              // Calculate subtotal for this line item
              if (isExclusiveOfTax) {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
              } else {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTotalTax));
              }
              
              usedTaxes.set(salesTax.id, salesTax);
            } else {
              let itemTaxAmount: number;
              if (isExclusiveOfTax) {
                itemTaxAmount = roundTo2Decimals(itemAmount * (salesTax.rate / 100));
              } else {
                itemTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + salesTax.rate));
              }
              totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
              
              // Calculate subtotal for this line item
              if (isExclusiveOfTax) {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
              } else {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTaxAmount));
              }
              
              usedTaxes.set(salesTax.id, salesTax);
              
              const existingTax = taxComponents.get(salesTax.id);
              if (existingTax) {
                existingTax.amount = roundTo2Decimals(existingTax.amount + itemTaxAmount);
                taxComponents.set(salesTax.id, existingTax);
              } else {
                taxComponents.set(salesTax.id, {
                  id: salesTax.id,
                  name: salesTax.name,
                  rate: salesTax.rate,
                  amount: itemTaxAmount,
                  isComponent: false
                });
              }
            }
          } else {
            let itemTaxAmount: number;
            if (isExclusiveOfTax) {
              itemTaxAmount = roundTo2Decimals(itemAmount * (salesTax.rate / 100));
            } else {
              itemTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + salesTax.rate));
            }
            totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
            
            // Calculate subtotal for this line item
            if (isExclusiveOfTax) {
              calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
            } else {
              calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTaxAmount));
            }
            
            usedTaxes.set(salesTax.id, salesTax);
            
            const existingTax = taxComponents.get(salesTax.id);
            if (existingTax) {
              existingTax.amount = roundTo2Decimals(existingTax.amount + itemTaxAmount);
              taxComponents.set(salesTax.id, existingTax);
            } else {
              taxComponents.set(salesTax.id, {
                id: salesTax.id,
                name: salesTax.name,
                rate: salesTax.rate,
                amount: itemTaxAmount,
                isComponent: false
              });
            }
          }
        }
      } else {
        // No tax on this line item - add full amount to subtotal
        calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
      }
    });
    
    const finalTaxAmount = manualTaxOverride !== undefined 
      ? (manualTaxOverride === null ? totalTaxAmount : manualTaxOverride)
      : (manualTaxAmount !== null ? manualTaxAmount : totalTaxAmount);
    // Total is always subtotal + tax
    const total = roundTo2Decimals(calculatedSubtotal + finalTaxAmount);
    
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    const taxComponentsArray = Array.from(taxComponents.values());
    form.taxComponentsInfo = taxComponentsArray;
    
    setSubTotal(calculatedSubtotal);
    setTaxAmount(finalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
  };

  const updateLineItemAmount = (index: number) => {
    calculateTotals();
  };

  const handleComponentChange = (componentId: number, value: number) => {
    if (isNaN(value)) return;
    
    const roundedValue = roundTo2Decimals(value);
    setManualComponentAmounts(prev => ({
      ...prev,
      [componentId]: roundedValue
    }));
    
    // Sum all components to get new total
    const allComponents = form.taxComponentsInfo || [];
    const newTotal = allComponents.reduce((sum, comp) => {
      const amount = comp.id === componentId ? roundedValue : (manualComponentAmounts[comp.id] ?? comp.amount);
      return sum + amount;
    }, 0);
    
    setManualTaxAmount(roundTo2Decimals(newTotal));
    calculateTotals(roundTo2Decimals(newTotal));
  };

  useEffect(() => {
    calculateTotals();
  }, [fields.length, isExclusiveOfTax]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: Expense) => {
    // Validate A/P and A/R account requirements
    const { hasAP, hasAR, accountsLoaded } = hasAccountsPayableOrReceivable(data.lineItems, accounts);
    
    if (!accountsLoaded) {
      toast({
        title: "Validation Error",
        description: "Account data is still loading. Please wait and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasAP || hasAR) {
      for (const item of data.lineItems) {
        const error = validateAccountContactRequirement(
          item.accountId,
          data.contactId,
          accounts,
          contacts
        );
        if (error) {
          toast({
            title: "Validation Error",
            description: error,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const enrichedData = {
      ...data,
      date: data.paymentDate || data.date,
      type: 'expense' as const,
      status: 'completed' as const,
      amount: totalAmount,
      subTotal,
      taxAmount,
      balance: totalAmount,
      lineItems: data.lineItems.map(item => ({
        ...item,
        accountId: item.accountId || null,
        salesTaxId: item.salesTaxId || null,
      })),
      attachments: selectedFiles.length > 0 ? selectedFiles.map(f => f.name) : undefined
    };
    
    console.log("Submitting expense data:", enrichedData);
    saveExpense.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Expense Details Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Expense Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payee</FormLabel>
                    <div className="flex gap-2 items-center">
                      <FormControl>
                        <SearchableSelect
                          items={[{ value: "", label: "None", subtitle: undefined }, ...contactItems]}
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => {
                            if (value === "") {
                              field.onChange(undefined);
                            } else {
                              field.onChange(parseInt(value));
                            }
                          }}
                          onAddNew={() => setShowAddVendorDialog(true)}
                          addNewText="Add New Vendor"
                          placeholder="Select a payee"
                          emptyText={contactsLoading ? "Loading contacts..." : "No contacts found"}
                          searchPlaceholder="Search contacts..."
                          disabled={contactsLoading}
                          className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                          data-testid="select-payee"
                        />
                      </FormControl>
                      {field.value !== undefined && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange(undefined)}
                          className="text-slate-400 hover:text-slate-600"
                          data-testid="button-clear-payee"
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Account</FormLabel>
                    <SearchableSelect
                      items={paymentAccountItems}
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      placeholder="Select payment account"
                      searchPlaceholder="Search accounts..."
                      emptyText={accountsLoading ? "Loading accounts..." : "No payment accounts available"}
                      disabled={accountsLoading}
                      onAddNew={() => {
                        setAccountDialogContext({type: 'payment'});
                        setShowAddAccountDialog(true);
                      }}
                      addNewText="Add New Account"
                      className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      data-testid="select-payment-account"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Date</FormLabel>
                    <Popover modal={true}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full h-11 justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-payment-date"
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Method</FormLabel>
                    <SearchableSelect
                      items={paymentMethodItems}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select payment method"
                      searchPlaceholder="Search methods..."
                      emptyText="No payment methods found"
                      className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                      data-testid="select-payment-method"
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
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ref No.</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                        {...field}
                        data-testid="input-reference"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isMultiCurrencyEnabled && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currency</FormLabel>
                    <FormItem>
                      <FormControl>
                        <Select
                          value={currency}
                          onValueChange={(value) => setCurrency(value)}
                          disabled={isEditing || isForeignCurrency}
                        >
                          <SelectTrigger className="bg-white border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map(curr => (
                              <SelectItem key={curr.code} value={curr.code}>
                                {curr.code} - {curr.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  </div>

                  {currency !== homeCurrency && (
                    <ExchangeRateInput
                      fromCurrency={currency}
                      toCurrency={homeCurrency}
                      value={exchangeRate}
                      onChange={handleExchangeRateChange}
                      isLoading={exchangeRateLoading}
                      date={expenseDate}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Line Items</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Amounts are</span>
              <Select
                value={isExclusiveOfTax ? "exclusive" : "inclusive"}
                onValueChange={(value) => setIsExclusiveOfTax(value === "exclusive")}
              >
                <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-slate-200 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                  <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="bg-slate-50 grid grid-cols-[25%_35%_20%_20%_auto] gap-2 px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                <div>Account</div>
                <div>Description</div>
                <div>Amount</div>
                <div>Sales Tax</div>
                <div></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[25%_35%_20%_20%_auto] gap-2 px-6 py-3 border-t border-slate-100 items-start">
                  <div>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.accountId`}
                      render={({ field }) => (
                        <FormItem>
                          <SearchableSelect
                            items={allAccountItems}
                            value={field.value?.toString()}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            placeholder="Select account"
                            searchPlaceholder="Search accounts..."
                            emptyText={accountsLoading ? "Loading..." : "No accounts available"}
                            disabled={accountsLoading}
                            onAddNew={() => {
                              setAccountDialogContext({type: 'lineItem', index});
                              setShowAddAccountDialog(true);
                            }}
                            addNewText="Add New Account"
                            className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                            data-testid={`select-account-${index}`}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Description"
                              className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                              {...field}
                              data-testid={`input-description-${index}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className="bg-white border-slate-200 h-10 text-right focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                updateLineItemAmount(index);
                              }}
                              data-testid={`input-amount-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.salesTaxId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <SearchableSelect
                              items={taxItems}
                              value={field.value?.toString() || "0"}
                              onValueChange={(value) => {
                                const numValue = parseInt(value);
                                if (numValue === 0) {
                                  field.onChange(undefined);
                                } else {
                                  field.onChange(numValue);
                                }
                                updateLineItemAmount(index);
                              }}
                              placeholder="None"
                              searchPlaceholder="Search taxes..."
                              emptyText={salesTaxesLoading ? "Loading..." : "No taxes found."}
                              className="bg-white border-slate-200 h-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg"
                              data-testid={`select-tax-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        data-testid={`button-remove-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl"
              onClick={() => append({ accountId: undefined, description: '', amount: 0, salesTaxId: undefined })}
              data-testid="button-add-line-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Totals</h3>
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between items-center text-slate-600">
              <span className="text-sm font-medium">Subtotal</span>
              <span className="font-medium text-right">${formatCurrency(subTotal)}</span>
            </div>

            {/* Tax Section - show EITHER main input OR components */}
            {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 ? (
              // COMPOSITE TAX: Show only editable components (no total line)
              <div className="space-y-1">
                {form.taxComponentsInfo.map((taxComponent: TaxComponentInfo) => (
                  <div key={taxComponent.id} className="flex justify-between items-center text-slate-600">
                    <span className="text-sm">
                      {taxComponent.name} ({taxComponent.rate}%)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualComponentAmounts[taxComponent.id] !== undefined ? manualComponentAmounts[taxComponent.id].toFixed(2) : taxComponent.amount.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            handleComponentChange(taxComponent.id, value);
                          }
                        }}
                        className="w-24 h-8 text-right px-2 font-medium bg-white border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // SIMPLE TAX: Show only main tax input (no components)
              <div className="flex justify-between items-center text-slate-600">
                <span className="text-sm">
                  {taxNames.length > 0 ? taxNames.join(', ') : 'Tax'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="font-medium">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualTaxAmount !== null ? manualTaxAmount.toFixed(2) : taxAmount.toFixed(2)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && e.target.value.trim() !== '') {
                        const roundedValue = roundTo2Decimals(value);
                        setManualTaxAmount(roundedValue);
                        setManualComponentAmounts({});
                        calculateTotals(roundedValue);
                      } else {
                        setManualTaxAmount(null);
                        setManualComponentAmounts({});
                        calculateTotals(null);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim() === '') {
                        setManualTaxAmount(null);
                        setManualComponentAmounts({});
                        calculateTotals(null);
                      } else if (manualTaxAmount !== null) {
                        const roundedValue = roundTo2Decimals(manualTaxAmount);
                        setManualTaxAmount(roundedValue);
                        calculateTotals(roundedValue);
                      }
                    }}
                    className="w-24 h-8 text-right px-2 font-medium bg-white border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between border-t border-slate-200 pt-3">
              <span className="text-sm font-semibold text-slate-900">Total</span>
              <span className="font-semibold text-slate-900 text-right">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
          </div>
        </div>

        {/* Memo Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Memo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add notes or memo..."
                      className="resize-none bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl min-h-[80px]"
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

        {/* Attachments Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6">
            <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 block">Attachments</FormLabel>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl"
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                {selectedFiles.length > 0 && (
                  <span className="text-sm text-slate-500">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-sm truncate flex-1 text-slate-700" data-testid={`file-name-${index}`}>
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        data-testid={`button-remove-file-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            disabled={saveExpense.isPending}
            className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
            data-testid="button-save"
          >
            {saveExpense.isPending ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>

      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountCreated={(accountId) => {
          if (accountDialogContext?.type === 'payment') {
            form.setValue('paymentAccountId', accountId);
          } else if (accountDialogContext?.type === 'lineItem' && accountDialogContext.index !== undefined) {
            form.setValue(`lineItems.${accountDialogContext.index}.accountId`, accountId);
          }
          setAccountDialogContext(null);
        }}
      />

      <AddVendorDialog
        open={showAddVendorDialog}
        onOpenChange={setShowAddVendorDialog}
        onSuccess={(vendorId) => {
          form.setValue('contactId', vendorId);
          queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
        }}
      />

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        fromCurrency={currency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={expenseDate}
        onConfirm={handleExchangeRateUpdate}
      />
    </Form>
  );
}
