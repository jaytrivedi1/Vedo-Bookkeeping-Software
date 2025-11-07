import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";

import { Bill, Contact, billSchema, Account, SalesTax } from "@shared/schema";
import { CURRENCIES } from "@shared/currencies";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Plus, Trash2 } from "lucide-react";
import AddVendorDialog from "@/components/dialogs/AddVendorDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";

export default function BillCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [vendors, setVendors] = useState<Contact[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Account[]>([]);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false);
  
  // Multi-currency state
  const [currency, setCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);

  // Fetch vendors (contacts of type "vendor")
  const { data: allContacts, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
    select: (data: Contact[]) => data,
  });

  // Fetch all accounts
  const { data: allAccounts, isLoading: isLoadingAccounts } = useQuery({
    queryKey: ["/api/accounts"],
    select: (data: Account[]) => data,
  });

  // Fetch sales tax options
  const { data: salesTaxes, isLoading: isLoadingSalesTaxes } = useQuery<SalesTax[]>({
    queryKey: ["/api/sales-taxes"],
  });
  
  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });
  
  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  useEffect(() => {
    if (allContacts) {
      // Filter contacts to only include vendors
      const vendorContacts = allContacts.filter(
        (contact) => contact.type === "vendor" || contact.type === "both"
      );
      setVendors(vendorContacts);
    }
  }, [allContacts]);

  useEffect(() => {
    if (allAccounts) {
      // Filter accounts to exclude Accounts Payable and Accounts Receivable
      const filteredAccounts = allAccounts.filter(
        (account) => account.type !== "accounts_payable" && account.type !== "accounts_receivable"
      );
      setExpenseAccounts(filteredAccounts);
    }
  }, [allAccounts]);

  // Transform expense accounts for SearchableSelect
  const expenseAccountItems: SearchableSelectItem[] = expenseAccounts.map((account) => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  // Transform vendors for SearchableSelect
  const vendorItems: SearchableSelectItem[] = vendors.map((vendor) => ({
    value: vendor.id.toString(),
    label: vendor.name,
    subtitle: undefined
  }));

  // Use a simple hardcoded pattern for bill numbers until the API is fixed
  const { data: nextBillNumber, isLoading: isLoadingBillNumber } = useQuery({
    queryKey: ["/api/transactions", "bill-prefix"],
    queryFn: async () => {
      try {
        // Get all transactions to find existing bills
        const response = await fetch("/api/transactions", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        
        const transactions = await response.json();
        
        // Find all bill transactions
        const bills = transactions.filter((t: any) => t.type === "bill" && t.reference && t.reference.startsWith("BILL-"));
        
        if (bills.length === 0) {
          return "BILL-0001"; // Start with BILL-0001 if no bills exist
        }
        
        // Extract numbers from bill references
        const billNumbers = bills.map((bill: any) => {
          const match = bill.reference.match(/BILL-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        
        // Find the highest number and increment by 1
        const highestNumber = Math.max(0, ...billNumbers);
        return `BILL-${(highestNumber + 1).toString().padStart(4, '0')}`;
      } catch (error) {
        console.error("Error generating bill number:", error);
        return "BILL-0001"; // Default value if anything fails
      }
    }
  });

  // Set up form with default values
  const form = useForm<Bill>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      date: new Date(),
      contactId: 0, // Using 0 as placeholder since contactId is required
      reference: "",
      description: "",
      status: "open",
      lineItems: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          accountId: undefined,
          salesTaxId: null,
        },
      ],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
      paymentTerms: "30",
      attachment: "",
    },
  });

  // Fetch exchange rate when currency or date changes
  const billDate = form.watch("date") || new Date();
  const vendorId = form.watch("contactId");
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: currency, toCurrency: homeCurrency, date: billDate }],
    enabled: isMultiCurrencyEnabled && currency !== homeCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${currency}&toCurrency=${homeCurrency}&date=${format(billDate, 'yyyy-MM-dd')}`
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
    } else if (currency === homeCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, currency, homeCurrency]);

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
        await apiRequest('PUT', '/api/exchange-rates', {
          fromCurrency: currency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(billDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        
        // Invalidate exchange rates cache
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates/rate'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all ${currency} transactions on ${format(billDate, 'dd/MM/yyyy')}.`,
        });
      } catch (error) {
        console.error('Error updating exchange rate:', error);
        toast({
          title: "Error",
          description: "Failed to update exchange rate. Please try again.",
          variant: "destructive",
        });
      }
    }

    setPendingExchangeRate(null);
    setShowExchangeRateDialog(false);
  };
  
  // Initialize currency to homeCurrency when preferences load
  useEffect(() => {
    if (homeCurrency) {
      setCurrency(homeCurrency);
    }
  }, [homeCurrency]);
  
  // Update currency when vendor changes
  useEffect(() => {
    if (vendorId && allContacts && isMultiCurrencyEnabled) {
      const vendor = allContacts.find(c => c.id === vendorId);
      if (vendor && vendor.currency) {
        setCurrency(vendor.currency);
      } else {
        setCurrency(homeCurrency);
      }
    }
  }, [vendorId, allContacts, isMultiCurrencyEnabled, homeCurrency]);
  
  // Keep currency in sync with homeCurrency when multi-currency is disabled
  useEffect(() => {
    if (!isMultiCurrencyEnabled && homeCurrency) {
      setCurrency(homeCurrency);
    }
  }, [isMultiCurrencyEnabled, homeCurrency]);
  
  // Update reference when next bill number is fetched
  useEffect(() => {
    if (nextBillNumber) {
      form.setValue("reference", nextBillNumber);
    }
  }, [nextBillNumber, form]);

  // Initialize totals when sales taxes are loaded or when tax mode changes
  useEffect(() => {
    if (salesTaxes && salesTaxes.length > 0) {
      updateTotals();
    }
  }, [salesTaxes, isExclusiveOfTax]);

  // Create mutation for saving the bill
  const createBill = useMutation({
    mutationFn: async (data: Bill) => {
      return await apiRequest("/api/bills", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bill created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      navigate("/transactions");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update amount when quantity or unit price changes
  const updateLineItemAmount = (index: number) => {
    const lineItems = form.getValues("lineItems");
    const quantity = Number(lineItems[index].quantity);
    const unitPrice = Number(lineItems[index].unitPrice);
    const amount = quantity * unitPrice;
    
    form.setValue(`lineItems.${index}.amount`, amount);
    
    // Also update totals
    updateTotals();
  };

  // Update subtotal and total when line items change
  const updateTotals = () => {
    const lineItems = form.getValues("lineItems");
    const subTotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
    
    // Calculate tax amount
    let totalTaxAmount = 0;
    
    // Loop through each line item and calculate its tax
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        // Find the tax rate for this line item
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          // Check if it's a composite tax with components
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            // For composite taxes, sum up all component rates
            const totalRate = components.reduce((sum, component) => sum + component.rate, 0);
            let taxAmount: number;
            if (isExclusiveOfTax) {
              taxAmount = (item.amount * totalRate) / 100;
            } else {
              taxAmount = item.amount - (item.amount * 100) / (100 + totalRate);
            }
            totalTaxAmount += taxAmount;
          } else {
            // For regular taxes, just use the rate directly
            let taxAmount: number;
            if (isExclusiveOfTax) {
              taxAmount = (item.amount * salesTax.rate) / 100;
            } else {
              taxAmount = item.amount - (item.amount * 100) / (100 + salesTax.rate);
            }
            totalTaxAmount += taxAmount;
          }
        }
      }
    });
    
    form.setValue("subTotal", subTotal);
    form.setValue("taxAmount", totalTaxAmount);
    form.setValue("totalAmount", isExclusiveOfTax ? subTotal + totalTaxAmount : subTotal);
  };

  // Add a new line item
  const addLineItem = () => {
    const lineItems = form.getValues("lineItems");
    lineItems.push({
      description: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
    form.setValue("lineItems", lineItems);
    updateTotals();
  };

  // Remove a line item
  const removeLineItem = (index: number) => {
    const lineItems = form.getValues("lineItems");
    if (lineItems.length === 1) {
      toast({
        title: "Cannot remove",
        description: "At least one line item is required",
        variant: "destructive",
      });
      return;
    }
    
    lineItems.splice(index, 1);
    form.setValue("lineItems", lineItems);
    updateTotals();
  };

  // Handle form submission
  const onSubmit = (data: Bill) => {
    // Ensure totals are calculated before submission
    updateTotals();
    
    const totalAmount = form.getValues("totalAmount") || 0;
    
    // Use the latest form data with updated totals and multi-currency fields
    const submissionData = {
      ...data,
      subTotal: form.getValues("subTotal") || 0,
      taxAmount: form.getValues("taxAmount") || 0,
      totalAmount,
      // Multi-currency fields
      currency,
      exchangeRate: exchangeRate.toString(),
      foreignAmount: currency !== homeCurrency ? totalAmount : null,
    };
    
    createBill.mutate(submissionData);
  };

  if (isLoadingContacts || isLoadingAccounts || isLoadingBillNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Bill</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createBill.isPending}
          >
            {createBill.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save Bill"
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Bill Details</TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="vendor">Vendor</Label>
                      <SearchableSelect
                        items={vendorItems}
                        value={form.watch("contactId") > 0 ? form.watch("contactId").toString() : ""}
                        onValueChange={(value) => {
                          const contactId = parseInt(value, 10);
                          if (!isNaN(contactId)) {
                            form.setValue("contactId", contactId);
                            form.trigger("contactId");
                          }
                        }}
                        onAddNew={() => setShowAddVendorDialog(true)}
                        addNewText="Add New Vendor"
                        placeholder="Select vendor"
                        searchPlaceholder="Search vendors..."
                        emptyText="No vendors found"
                        className={form.formState.errors.contactId ? "border-destructive" : ""}
                      />
                      {form.formState.errors.contactId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.contactId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reference">Bill Number</Label>
                      <Input
                        id="reference"
                        {...form.register("reference")}
                        className={form.formState.errors.reference ? "border-destructive" : ""}
                      />
                      {form.formState.errors.reference && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.reference.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date">Bill Date</Label>
                      <DatePicker
                        date={form.watch("date")}
                        setDate={(date) => {
                          form.setValue("date", date);
                          // Update due date based on payment terms when bill date changes
                          const paymentTerms = form.getValues("paymentTerms");
                          if (paymentTerms) {
                            let dueDate = new Date(date);
                            const days = parseInt(paymentTerms) || 30;
                            dueDate.setDate(dueDate.getDate() + days);
                            form.setValue("dueDate", dueDate);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <DatePicker
                        date={form.watch("dueDate") || new Date()}
                        setDate={(date) => form.setValue("dueDate", date)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={form.getValues("paymentTerms")}
                        onValueChange={(value) => {
                          form.setValue("paymentTerms", value);
                          
                          // Set due date based on payment terms
                          const billDate = form.getValues("date") || new Date();
                          let dueDate = new Date(billDate);
                          
                          if (value === "15") {
                            dueDate.setDate(dueDate.getDate() + 15);
                          } else if (value === "30") {
                            dueDate.setDate(dueDate.getDate() + 30);
                          } else if (value === "60") {
                            dueDate.setDate(dueDate.getDate() + 60);
                          }
                          
                          form.setValue("dueDate", dueDate);
                        }}
                      >
                        <SelectTrigger id="paymentTerms">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Due on Receipt</SelectItem>
                          <SelectItem value="15">Net 15</SelectItem>
                          <SelectItem value="30">Net 30</SelectItem>
                          <SelectItem value="60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isMultiCurrencyEnabled ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="currency">Currency</Label>
                          <Select value={currency} onValueChange={(value) => setCurrency(value)}>
                            <SelectTrigger id="currency">
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
                        </div>
                        
                        {currency !== homeCurrency && (
                          <ExchangeRateInput
                            fromCurrency={currency}
                            toCurrency={homeCurrency}
                            value={exchangeRate}
                            onChange={handleExchangeRateChange}
                            isLoading={exchangeRateLoading}
                            date={billDate}
                          />
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label htmlFor="attachment">File Attachment</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="attachment"
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // In a real implementation, this would upload the file
                                console.log("File selected:", file.name);
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="h-20"
                    />
                  </div>

                  <Separator />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">Line Items</div>
                      <div className="w-full flex justify-end">
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
                    </div>
                    <div className="rounded-md border">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="text-center p-2 w-12">#</th>
                            <th className="text-left p-2 pl-3">Account</th>
                            <th className="text-left p-2">Description</th>
                            <th className="text-right p-2">Quantity</th>
                            <th className="text-right p-2">Unit Price</th>
                            <th className="text-right p-2">Amount</th>
                            <th className="text-left p-2">Sales Tax</th>
                            <th className="w-10 p-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.getValues("lineItems").map((_, index) => (
                            <tr key={index} className="border-t">
                              <td className="p-2 text-center text-muted-foreground">
                                {index + 1}
                              </td>
                              <td className="p-2 pl-3">
                                <SearchableSelect
                                  items={expenseAccountItems}
                                  value={form.getValues(`lineItems.${index}.accountId`)?.toString()}
                                  onValueChange={(value) => {
                                    form.setValue(`lineItems.${index}.accountId`, parseInt(value));
                                  }}
                                  placeholder="Select account"
                                  searchPlaceholder="Search accounts..."
                                  emptyText="No accounts found."
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  {...form.register(`lineItems.${index}.description`)}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.description
                                      ? "border-destructive"
                                      : ""
                                  }
                                />
                                {form.formState.errors.lineItems?.[index]?.description && (
                                  <p className="text-xs text-destructive mt-1">
                                    {form.formState.errors.lineItems[index]?.description?.message}
                                  </p>
                                )}
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  {...form.register(`lineItems.${index}.quantity`, {
                                    onChange: () => updateLineItemAmount(index),
                                    valueAsNumber: true,
                                  })}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.quantity
                                      ? "border-destructive text-right"
                                      : "text-right"
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  {...form.register(`lineItems.${index}.unitPrice`, {
                                    onChange: () => updateLineItemAmount(index),
                                    valueAsNumber: true,
                                  })}
                                  className={
                                    form.formState.errors.lineItems?.[index]?.unitPrice
                                      ? "border-destructive text-right"
                                      : "text-right"
                                  }
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  readOnly
                                  {...form.register(`lineItems.${index}.amount`)}
                                  className="bg-muted text-right"
                                />
                              </td>
                              <td className="p-2">
                                <FormField
                                  control={form.control}
                                  name={`lineItems.${index}.salesTaxId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Select
                                          value={field.value?.toString() || "0"}
                                          onValueChange={(value) => {
                                            const numValue = parseInt(value);
                                            if (numValue === 0) {
                                              field.onChange(null);
                                            } else {
                                              field.onChange(numValue);
                                            }
                                            updateTotals();
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select tax" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            {salesTaxes?.filter(tax => !tax.parentId).map((tax: any) => (
                                              <SelectItem key={tax.id} value={tax.id.toString()}>
                                                {tax.name} ({tax.rate}%)
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={addLineItem}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Line Item
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-1/3 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        {currency !== homeCurrency ? (
                          <div className="text-right">
                            <div>{CURRENCIES.find(c => c.code === currency)?.symbol || currency}{form.watch("subTotal")?.toFixed(2) || "0.00"}</div>
                            <div className="text-xs text-gray-500">
                              ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{((form.watch("subTotal") || 0) * exchangeRate).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span>${form.watch("subTotal")?.toFixed(2) || "0.00"}</span>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        {currency !== homeCurrency ? (
                          <div className="text-right">
                            <div>{CURRENCIES.find(c => c.code === currency)?.symbol || currency}{form.watch("taxAmount")?.toFixed(2) || "0.00"}</div>
                            <div className="text-xs text-gray-500">
                              ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{((form.watch("taxAmount") || 0) * exchangeRate).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span>${form.watch("taxAmount")?.toFixed(2) || "0.00"}</span>
                        )}
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        {currency !== homeCurrency ? (
                          <div className="text-right">
                            <div>{CURRENCIES.find(c => c.code === currency)?.symbol || currency}{form.watch("totalAmount")?.toFixed(2) || "0.00"}</div>
                            <div className="text-xs text-gray-500">
                              ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{((form.watch("totalAmount") || 0) * exchangeRate).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span>${form.watch("totalAmount")?.toFixed(2) || "0.00"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="payment" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="dueDate">Due Date</Label>
                      <DatePicker
                        date={form.getValues("dueDate") || new Date()}
                        setDate={(date) => form.setValue("dueDate", date)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="paymentTerms">Payment Terms</Label>
                      <Select
                        value={form.getValues("paymentTerms")?.toString()}
                        onValueChange={(value) => {
                          form.setValue("paymentTerms", value);
                          // Update due date based on terms
                          const newDueDate = new Date(form.getValues("date"));
                          const days = parseInt(value) || 0;
                          newDueDate.setDate(newDueDate.getDate() + days);
                          form.setValue("dueDate", newDueDate);
                        }}
                      >
                        <SelectTrigger id="paymentTerms">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Due on receipt</SelectItem>
                          <SelectItem value="7">Net 7</SelectItem>
                          <SelectItem value="15">Net 15</SelectItem>
                          <SelectItem value="30">Net 30</SelectItem>
                          <SelectItem value="60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </form>
      </Form>

      <AddVendorDialog
        open={showAddVendorDialog}
        onOpenChange={setShowAddVendorDialog}
        onSuccess={(vendorId) => {
          form.setValue('contactId', vendorId);
          form.trigger('contactId');
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
        date={billDate}
        onConfirm={handleExchangeRateUpdate}
      />
    </div>
  );
}