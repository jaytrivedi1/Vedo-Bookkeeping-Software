import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, X, Trash2, PlusCircle, FileText, Receipt, DollarSign, InfoIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest } from "@/lib/queryClient";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";
import { Account, Contact, SalesTax } from "@shared/schema";

// Define the deposit line item schema
const depositLineItemSchema = z.object({
  receivedFrom: z.string().optional(),
  contactId: z.number().optional(),
  accountId: z.number().optional(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  refNo: z.string().optional(),
  amount: z.number().min(0, "Amount must be a positive number").default(0),
  salesTaxId: z.number().optional(),
});

// Define the deposit schema - this will be transformed to match the server schema before submission
const depositSchema = z.object({
  depositAccountId: z.number({ required_error: "Please select a deposit account" }),
  date: z.date({ required_error: "Please select a date" }),
  reference: z.string().optional(),
  lineItems: z.array(depositLineItemSchema).min(1, "At least one item is required"),
  memo: z.string().optional(),
  attachment: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositFormProps {
  onSuccess?: () => void;
  initialData?: any;
  ledgerEntries?: any[];
  isEditing?: boolean;
}

export default function DepositForm({ onSuccess, initialData, ledgerEntries, isEditing = false }: DepositFormProps) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [accountDialogContext, setAccountDialogContext] = useState<{type: 'deposit' | 'lineItem', index?: number} | null>(null);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(initialData?.exchangeRate ? parseFloat(initialData.exchangeRate) : 1);

  // Fetch accounts for the dropdown
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch contacts for the dropdown
  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Fetch sales taxes for the dropdown
  const { data: salesTaxes } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });

  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';

  // Transform sales taxes for SearchableSelect (filter main taxes only)
  const taxItems: SearchableSelectItem[] = salesTaxes?.filter(tax => !tax.parentId).map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined
  })) || [];

  // Filter bank and credit accounts
  const bankAccounts = accounts?.filter(account => 
    account.type === 'bank' || account.type === 'credit_card'
  ) || [];

  // All accounts for dropdown
  const allAccounts = accounts || [];

  // Filter accounts for the line items (income accounts typically)
  const depositableAccounts = accounts?.filter(account => 
    account.type === 'income' || account.type === 'other_income'
  ) || [];

  // Transform contacts into SearchableSelectItem format (uses contact.name as value for deposit)
  const contactItems: SearchableSelectItem[] = contacts?.map(contact => ({
    value: contact.name,
    label: contact.name,
    subtitle: `· ${contact.type}`
  })) || [];

  // Transform bank accounts into SearchableSelectItem format
  const bankAccountItems: SearchableSelectItem[] = bankAccounts.map(account => ({
    value: account.id.toString(),
    label: `${account.name} ${account.code ? `(${account.code})` : ''}`,
    subtitle: undefined
  }));

  // Transform all accounts into SearchableSelectItem format
  const allAccountItems: SearchableSelectItem[] = allAccounts.map(account => ({
    value: account.id.toString(),
    label: `${account.name} ${account.code ? `(${account.code})` : ''}`,
    subtitle: undefined
  }));
  
  // Transform payment methods into SearchableSelectItem format
  const paymentMethodItems: SearchableSelectItem[] = [
    { value: "cash", label: "Cash", subtitle: undefined },
    { value: "cheque", label: "Cheque", subtitle: undefined },
    { value: "bank_transfer", label: "Bank Transfer", subtitle: undefined },
    { value: "credit_card", label: "Credit Card", subtitle: undefined }
  ];
  
  // Set up default values or populate from initialData if editing
  const getDestinationAccountId = () => {
    if (initialData && ledgerEntries) {
      // Find the debit entry which represents the destination account
      const debitEntry = ledgerEntries.find(entry => entry.debit > 0);
      return debitEntry?.accountId;
    }
    return undefined;
  };
  
  const getSourceAccountId = () => {
    if (initialData && ledgerEntries) {
      // Find the credit entry which represents the source account
      const creditEntry = ledgerEntries.find(entry => entry.credit > 0);
      return creditEntry?.accountId;
    }
    return undefined;
  };
  
  // Initialize form with default values or from initialData if editing
  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: initialData ? {
      date: initialData.date ? new Date(initialData.date) : new Date(),
      reference: initialData.reference || `DEP-${initialData.id}`,
      depositAccountId: getDestinationAccountId(),
      lineItems: [
        {
          receivedFrom: '',
          contactId: initialData.contactId || undefined,
          accountId: getSourceAccountId(),
          description: initialData.description || '',
          paymentMethod: '',
          refNo: '',
          amount: initialData.amount || 0,
          salesTaxId: undefined,
        }
      ],
      memo: initialData.description || '',
      attachment: '',
    } : {
      date: new Date(),
      reference: `DEP-${new Date().toISOString().split('T')[0]}`,
      depositAccountId: undefined,
      lineItems: [
        {
          receivedFrom: '',
          contactId: undefined,
          accountId: undefined,
          description: '',
          paymentMethod: '',
          refNo: '',
          amount: 0,
          salesTaxId: undefined,
        }
      ],
      memo: '',
      attachment: '',
    },
  });

  // Create field array for line items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Watch for changes to line items to recalculate totals
  const lineItems = form.watch("lineItems");

  // Watch for deposit account changes to detect foreign currency
  const depositAccountId = form.watch("depositAccountId");
  const depositDate = form.watch("date") || new Date();

  // Detect foreign currency from selected bank account
  const selectedAccount = accounts?.find(acc => acc.id === depositAccountId);
  const accountCurrency = selectedAccount?.currency || homeCurrency;
  const isForeignCurrency = accountCurrency !== homeCurrency;

  // Fetch exchange rate when currency or date changes
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: accountCurrency, toCurrency: homeCurrency, date: depositDate }],
    enabled: isForeignCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${accountCurrency}&toCurrency=${homeCurrency}&date=${format(depositDate, 'yyyy-MM-dd')}`
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
          date: format(depositDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all transactions on ${format(depositDate, 'MMMM dd, yyyy')}.`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update exchange rate in database.",
          variant: "destructive",
        });
      }
    }
    
    setPendingExchangeRate(null);
  };
  
  // Function to calculate sales tax amount
  const calculateSalesTax = (amount: number, taxId?: number) => {
    if (!taxId || !salesTaxes) return 0;
    const tax = salesTaxes.find(t => t.id === taxId);
    if (!tax) return 0;
    
    if (isExclusiveOfTax) {
      return (amount * tax.rate) / 100;
    } else {
      // Calculate tax amount from inclusive price
      return amount - (amount * 100) / (100 + tax.rate);
    }
  };
  
  // Calculate subtotal, tax, and total
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.amount || 0), 
    0
  );
  
  const taxAmount = lineItems.reduce(
    (sum, item) => sum + calculateSalesTax(item.amount || 0, item.salesTaxId), 
    0
  );
  
  const total = isExclusiveOfTax ? subtotal + taxAmount : subtotal;

  // Mutation for creating a new deposit
  const createDepositMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/deposits', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Deposit has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create deposit: ${error}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutation for updating an existing deposit
  const updateDepositMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!initialData?.id) throw new Error("Missing deposit ID for update");
      
      // For deposit updates, we need to update the ledger entries as well
      if (ledgerEntries && ledgerEntries.length > 0) {
        // Find the debit and credit entries
        const debitEntry = ledgerEntries.find(entry => entry.debit > 0);
        const creditEntry = ledgerEntries.find(entry => entry.credit > 0);
        
        // Update the ledger entries if the amount has changed
        if (debitEntry && creditEntry && data.amount !== initialData.amount) {
          console.log(`Updating ledger entries for deposit ${initialData.id}: amount ${initialData.amount} -> ${data.amount}`);
          
          // For unapplied credits, we need to set the balance to negative amount
          if (initialData.status === 'unapplied_credit') {
            data.balance = -data.amount;
            console.log(`Setting balance to ${data.balance} for unapplied credit`);
          }
          
          try {
            // Update debit entry
            await apiRequest(`/api/ledger-entries/${debitEntry.id}`, 'PATCH', {
              debit: data.amount,
              date: data.date
            });
            
            // Update credit entry
            await apiRequest(`/api/ledger-entries/${creditEntry.id}`, 'PATCH', {
              credit: data.amount,
              date: data.date
            });
            
            console.log('Successfully updated ledger entries');
          } catch (error) {
            console.error('Error updating ledger entries:', error);
          }
        }
      }
      
      return await apiRequest(`/api/transactions/${initialData.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Deposit has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update deposit: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: DepositFormValues) => {
    // Validation checks
    if (!data.lineItems[0]?.accountId) {
      toast({
        title: "Error",
        description: "Please select at least one account for the deposit",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate the total amount from line items
    const amount = data.lineItems.reduce((sum, item) => sum + (item.amount || 0), 0) + taxAmount;
    
    // Find the first line item account to use as source
    const sourceAccountId = data.lineItems[0]?.accountId;
    const contactId = data.lineItems[0]?.contactId;
    
    if (!sourceAccountId) {
      toast({
        title: "Error",
        description: "Please select a source account",
        variant: "destructive",
      });
      return;
    }
    
    // Check if using Accounts Receivable (id: 2) without a customer
    if (sourceAccountId === 2 && !contactId) {
      toast({
        title: "Customer Required",
        description: "When using Accounts Receivable, you must select a customer",
        variant: "destructive",
      });
      return;
    }
    
    // Check if using Accounts Payable (id: 3) without a vendor
    if (sourceAccountId === 3 && !contactId) {
      toast({
        title: "Vendor Required",
        description: "When using Accounts Payable, you must select a vendor",
        variant: "destructive",
      });
      return;
    }
    
    // Check contact type matches account type
    if (contactId && sourceAccountId === 2) {
      const contact = contacts?.find(c => c.id === contactId);
      if (contact && !(contact.type === 'customer' || contact.type === 'both')) {
        toast({
          title: "Invalid Contact Type",
          description: "Accounts Receivable must be associated with a customer",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (contactId && sourceAccountId === 3) {
      const contact = contacts?.find(c => c.id === contactId);
      if (contact && !(contact.type === 'vendor' || contact.type === 'both')) {
        toast({
          title: "Invalid Contact Type",
          description: "Accounts Payable must be associated with a vendor",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Format data to match server schema
    const serverData = {
      date: data.date,
      reference: data.reference,
      description: data.lineItems[0]?.description || 'Deposit',
      amount: amount,
      sourceAccountId: sourceAccountId,
      destinationAccountId: data.depositAccountId,
      contactId: contactId,
    };
    
    // Determine if we're creating or updating
    if (isEditing && initialData?.id) {
      // Update existing deposit
      updateDepositMutation.mutate(serverData);
    } else {
      // Create new deposit
      createDepositMutation.mutate(serverData);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header with basic deposit info */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-xl font-bold flex items-center">
                <DollarSign className="h-6 w-6 mr-2 text-primary" />
                <span>{isEditing ? 'Edit Deposit' : 'Create Deposit'}</span>
              </CardTitle>
              <CardDescription>
                {isEditing 
                  ? 'Update the details of this deposit' 
                  : 'Record funds deposited into your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-row gap-4">
                <FormField
                  control={form.control}
                  name="depositAccountId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Deposit Account</FormLabel>
                      <SearchableSelect
                        items={bankAccountItems}
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        placeholder="Select account"
                        searchPlaceholder="Search accounts..."
                        emptyText="No accounts found."
                        onAddNew={() => {
                          setAccountDialogContext({type: 'deposit'});
                          setShowAddAccountDialog(true);
                        }}
                        addNewText="Add New Account"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Reference #</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          className="h-10"
                          placeholder="Enter a unique reference number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="pl-3 text-left font-normal w-full h-10"
                            >
                              {field.value ? (
                                format(field.value, "MMMM dd, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Exchange Rate Input - Show when foreign currency is detected */}
              {isForeignCurrency && (
                <div className="mt-4">
                  <ExchangeRateInput
                    fromCurrency={accountCurrency}
                    toCurrency={homeCurrency}
                    value={exchangeRate}
                    onChange={handleExchangeRateChange}
                    isLoading={exchangeRateLoading}
                    date={depositDate}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <div className="w-full flex justify-end mb-2">
            <div className="flex items-center">
              <span className="mr-2 text-sm text-muted-foreground">Amounts are</span>
              <Select
                value={isExclusiveOfTax ? "exclusive" : "inclusive"}
                onValueChange={(value) => setIsExclusiveOfTax(value === "exclusive")}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                  <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-lg flex items-center">
                <PlusCircle className="h-5 w-5 mr-2" />
                <span>Add funds to this deposit</span>
              </CardTitle>
              <CardDescription>Record all funds to be added in this deposit</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-t border-b">
                      <th className="w-10 px-4 py-3 text-left"></th>
                      <th className="px-4 py-3 text-left">RECEIVED FROM</th>
                      <th className="px-4 py-3 text-left">ACCOUNT</th>
                      <th className="px-4 py-3 text-left">DESCRIPTION</th>
                      <th className="px-4 py-3 text-left">PAYMENT METHOD</th>
                      <th className="px-4 py-3 text-right">AMOUNT (CAD)</th>
                      <th className="px-4 py-3 text-left">SALES TAX</th>
                      <th className="w-10 px-4 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b">
                        <td className="px-4 py-3 text-center text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.receivedFrom`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <SearchableSelect
                                    items={[{ value: "none", label: "-- Select a source --", subtitle: undefined }, ...contactItems]}
                                    value={field.value || "none"}
                                    onValueChange={(value) => {
                                      field.onChange(value === "none" ? "" : value);
                                      // When a contact is selected, update the contactId
                                      if (value !== "none") {
                                        const contact = contacts?.find(c => c.name === value);
                                        if (contact) {
                                          form.setValue(`lineItems.${index}.contactId`, contact.id);
                                        }
                                      } else {
                                        form.setValue(`lineItems.${index}.contactId`, undefined);
                                      }
                                    }}
                                    placeholder="Select source"
                                    emptyText="No contacts found"
                                    searchPlaceholder="Search contacts..."
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
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
                                  emptyText="No accounts found."
                                  onAddNew={() => {
                                    setAccountDialogContext({type: 'lineItem', index});
                                    setShowAddAccountDialog(true);
                                  }}
                                  addNewText="Add New Account"
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Description"
                                    className="border border-input rounded-md px-3 py-1 w-full"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.paymentMethod`}
                            render={({ field }) => (
                              <FormItem>
                                <SearchableSelect
                                  items={paymentMethodItems}
                                  value={field.value?.toString()}
                                  onValueChange={(value) => field.onChange(value)}
                                  placeholder="Select method"
                                  searchPlaceholder="Search methods..."
                                  emptyText="No payment methods found"
                                />
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="border border-input rounded-md px-3 py-1 w-full text-right"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
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
                                    }}
                                    placeholder="Tax rate"
                                    searchPlaceholder="Search taxes..."
                                    emptyText="No taxes found."
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => append({
                                receivedFrom: '',
                                contactId: undefined,
                                accountId: undefined,
                                description: '',
                                paymentMethod: '',
                                refNo: '',
                                amount: 0,
                                salesTaxId: undefined,
                              })}
                            >
                              Add Items
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                form.setValue("lineItems", [
                                  {
                                    receivedFrom: '',
                                    contactId: undefined,
                                    accountId: undefined,
                                    description: '',
                                    paymentMethod: '',
                                    refNo: '',
                                    amount: 0,
                                    salesTaxId: undefined,
                                  }
                                ]);
                              }}
                            >
                              Clear all lines
                            </Button>
                          </div>
                          <div className="text-right space-y-2">
                            <div className="flex justify-end items-center">
                              <span className="w-32 text-right">Subtotal</span>
                              <span className="ml-4 w-32 text-right font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(subtotal)}
                              </span>
                            </div>
                            <div className="flex justify-end items-center">
                              <span className="w-32 text-right">Tax</span>
                              <span className="ml-4 w-32 text-right font-medium">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(taxAmount)}
                              </span>
                            </div>
                            <div className="flex justify-end items-center">
                              <span className="w-32 text-right font-bold">Total</span>
                              <span className="ml-4 w-32 text-right font-bold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CAD' }).format(total)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card className="shadow-sm">
            <CardHeader className="bg-muted/50 pb-3">
              <CardTitle className="text-lg flex items-center">
                <InfoIcon className="h-5 w-5 mr-2" />
                <span>Additional Information</span>
              </CardTitle>
              <CardDescription>Add notes, memos, and file attachments</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormField
                    control={form.control}
                    name="memo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Memo</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field}
                            placeholder="Add any notes or details about this deposit" 
                            className="min-h-[100px]"
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
                    name="attachment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Attachment</FormLabel>
                        <div className="mt-2 flex items-center space-x-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => {
                              // In a real implementation, this would open a file dialog
                              // For now, we'll just set a placeholder value
                              field.onChange("example-attachment.pdf");
                              toast({
                                title: "Attachment added",
                                description: "example-attachment.pdf has been added",
                              });
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>{field.value ? field.value : "Add Attachment"}</span>
                          </Button>
                          {field.value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => field.onChange("")}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Attach receipts or other documents (PDF, JPG, PNG)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer buttons */}
          <div className="flex justify-between items-center pt-6 mt-4 border-t">
            <div>
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => window.history.back()}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            <div className="space-x-2">
              <Button
                type="submit"
                className="px-6"
                disabled={createDepositMutation.isPending}
              >
                {createDepositMutation.isPending ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span> 
                    Saving...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    {isEditing ? 'Update Deposit' : 'Save Deposit'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <AddAccountDialog
          open={showAddAccountDialog}
          onOpenChange={setShowAddAccountDialog}
          onAccountCreated={(accountId) => {
            if (accountDialogContext?.type === 'deposit') {
              form.setValue('depositAccountId', accountId);
            } else if (accountDialogContext?.type === 'lineItem' && accountDialogContext.index !== undefined) {
              form.setValue(`lineItems.${accountDialogContext.index}.accountId`, accountId);
            }
            setAccountDialogContext(null);
          }}
        />

        <ExchangeRateUpdateDialog
          open={showExchangeRateDialog}
          onOpenChange={setShowExchangeRateDialog}
          fromCurrency={accountCurrency}
          toCurrency={homeCurrency}
          oldRate={exchangeRate}
          newRate={pendingExchangeRate || exchangeRate}
          date={depositDate}
          onConfirm={handleExchangeRateUpdate}
        />
      </Form>
    </div>
  );
}