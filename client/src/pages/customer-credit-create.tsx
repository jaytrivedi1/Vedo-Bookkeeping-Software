import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { z } from "zod";

import { Contact, Account, SalesTax } from "@shared/schema";
import { formatContactName } from "@/lib/currencyUtils";
import { format } from "date-fns";
import {
  Form,
  FormField,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import AddCustomerDialog from "@/components/dialogs/AddCustomerDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";

// Define form schema for customer credit
const customerCreditSchema = z.object({
  date: z.date(),
  contactId: z.number().min(1, "Customer is required"),
  reference: z.string().min(1, "Credit number is required"),
  description: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(0.01, "Quantity must be at least 0.01"),
    unitPrice: z.number().min(0, "Unit price must be positive"),
    amount: z.number(),
    accountId: z.number().optional(),
    salesTaxId: z.number().nullable().optional(),
  })).min(1, "At least one line item is required"),
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
});

type CustomerCreditForm = z.infer<typeof customerCreditSchema>;

export default function CustomerCreditCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("details");
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [revenueAccounts, setRevenueAccounts] = useState<Account[]>([]);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);

  // Fetch customers (contacts of type "customer")
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

  // Fetch preferences for home currency
  const { data: preferences } = useQuery<any>({
    queryKey: ["/api/preferences"],
  });

  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  useEffect(() => {
    if (allContacts) {
      const customerContacts = allContacts.filter(
        (contact) => contact.type === "customer" || contact.type === "both"
      );
      setCustomers(customerContacts);
    }
  }, [allContacts]);

  useEffect(() => {
    if (allAccounts) {
      const filteredAccounts = allAccounts.filter(
        (account) => account.type === "income" || account.type === "other_income"
      );
      setRevenueAccounts(filteredAccounts);
    }
  }, [allAccounts]);

  // Transform revenue accounts for SearchableSelect
  const revenueAccountItems: SearchableSelectItem[] = revenueAccounts.map((account) => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  // Transform customers for SearchableSelect
  const customerItems: SearchableSelectItem[] = customers.map((customer) => ({
    value: customer.id.toString(),
    label: formatContactName(customer.name, customer.currency, homeCurrency),
    subtitle: undefined
  }));

  // Generate next customer credit number
  const { data: nextCreditNumber, isLoading: isLoadingCreditNumber } = useQuery({
    queryKey: ["/api/transactions", "customer-credit-prefix"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/transactions", {
          method: "GET",
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("Failed to fetch transactions");
        }
        
        const transactions = await response.json();
        const credits = transactions.filter((t: any) => t.type === "customer_credit" && t.reference && t.reference.startsWith("CM-"));
        
        if (credits.length === 0) {
          return "CM-0001";
        }
        
        const creditNumbers = credits.map((credit: any) => {
          const match = credit.reference.match(/CM-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        });
        
        const highestNumber = Math.max(0, ...creditNumbers);
        return `CM-${(highestNumber + 1).toString().padStart(4, '0')}`;
      } catch (error) {
        console.error("Error generating credit number:", error);
        return "CM-0001";
      }
    }
  });

  // Set up form with default values
  const form = useForm<CustomerCreditForm>({
    resolver: zodResolver(customerCreditSchema),
    defaultValues: {
      date: new Date(),
      contactId: 0,
      reference: "",
      description: "",
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
    },
  });

  useEffect(() => {
    if (nextCreditNumber) {
      form.setValue("reference", nextCreditNumber);
    }
  }, [nextCreditNumber, form]);

  // Watch for customer and date changes to detect foreign currency
  const contactId = form.watch("contactId");
  const creditDate = form.watch("date") || new Date();
  
  // Detect foreign currency from selected customer
  const selectedCustomer = allContacts?.find(c => c.id === contactId);
  const customerCurrency = selectedCustomer?.currency || homeCurrency;
  const isForeignCurrency = customerCurrency !== homeCurrency && isMultiCurrencyEnabled;

  // Fetch exchange rate when foreign currency is detected
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: customerCurrency, toCurrency: homeCurrency, date: creditDate }],
    enabled: isForeignCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${customerCurrency}&toCurrency=${homeCurrency}&date=${format(creditDate, 'yyyy-MM-dd')}`
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
          fromCurrency: customerCurrency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(creditDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all transactions on ${format(creditDate, 'PPP')}.`,
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

  useEffect(() => {
    if (salesTaxes && salesTaxes.length > 0) {
      updateTotals();
    }
  }, [salesTaxes, isExclusiveOfTax]);

  // Create mutation for saving the customer credit
  const createCustomerCredit = useMutation({
    mutationFn: async (data: CustomerCreditForm) => {
      const payload = {
        ...data,
        type: "customer_credit",
        status: "unapplied_credit",
      };
      return await apiRequest("/api/customer-credits", "POST", payload);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer credit created successfully",
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

  const updateLineItemAmount = (index: number) => {
    const lineItems = form.getValues("lineItems");
    const quantity = Number(lineItems[index].quantity);
    const unitPrice = Number(lineItems[index].unitPrice);
    const amount = quantity * unitPrice;
    
    form.setValue(`lineItems.${index}.amount`, amount);
    updateTotals();
  };

  const updateTotals = () => {
    const lineItems = form.getValues("lineItems");
    const subTotal = lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
    
    let totalTaxAmount = 0;
    
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            const totalRate = components.reduce((sum, component) => sum + component.rate, 0);
            let taxAmount: number;
            if (isExclusiveOfTax) {
              taxAmount = (item.amount * totalRate) / 100;
            } else {
              taxAmount = item.amount - (item.amount * 100) / (100 + totalRate);
            }
            totalTaxAmount += taxAmount;
          } else {
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

  const onSubmit = (data: CustomerCreditForm) => {
    updateTotals();
    
    const submissionData = {
      ...data,
      subTotal: form.getValues("subTotal") || 0,
      taxAmount: form.getValues("taxAmount") || 0,
      totalAmount: form.getValues("totalAmount") || 0,
    };
    
    createCustomerCredit.mutate(submissionData);
  };

  const handleAddCustomer = (customerId: number) => {
    form.setValue("contactId", customerId);
    setShowAddCustomerDialog(false);
    queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
  };

  if (isLoadingContacts || isLoadingAccounts || isLoadingCreditNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Create Customer Credit</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.history.back()} data-testid="button-cancel">
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={form.handleSubmit(onSubmit)}
            disabled={createCustomerCredit.isPending}
            data-testid="button-save"
          >
            {createCustomerCredit.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
              </>
            ) : (
              "Save Credit"
            )}
          </Button>
        </div>
      </div>

      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onSuccess={handleAddCustomer}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="details">Credit Details</TabsTrigger>
            </TabsList>

            <Card>
              <CardContent className="p-6">
                <TabsContent value="details" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label htmlFor="customer">Customer</Label>
                      <SearchableSelect
                        items={customerItems}
                        value={form.watch("contactId") > 0 ? form.watch("contactId").toString() : ""}
                        onValueChange={(value) => {
                          const contactId = parseInt(value, 10);
                          if (!isNaN(contactId)) {
                            form.setValue("contactId", contactId);
                            form.trigger("contactId");
                          }
                        }}
                        onAddNew={() => setShowAddCustomerDialog(true)}
                        addNewText="Add New Customer"
                        placeholder="Select customer"
                        searchPlaceholder="Search customers..."
                        emptyText="No customers found"
                        className={form.formState.errors.contactId ? "border-destructive" : ""}
                        data-testid="select-customer"
                      />
                      {form.formState.errors.contactId && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.contactId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="reference">Credit Number</Label>
                      <Input
                        id="reference"
                        {...form.register("reference")}
                        className={form.formState.errors.reference ? "border-destructive" : ""}
                        data-testid="input-reference"
                      />
                      {form.formState.errors.reference && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.reference.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="date">Credit Date</Label>
                      <DatePicker
                        date={form.watch("date")}
                        setDate={(date) => form.setValue("date", date)}
                        data-testid="date-picker-date"
                      />
                    </div>
                  </div>

                  {/* Exchange Rate Section for Foreign Currency Customers */}
                  {isForeignCurrency && (
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <ExchangeRateInput
                        fromCurrency={customerCurrency}
                        toCurrency={homeCurrency}
                        value={exchangeRate}
                        onChange={handleExchangeRateChange}
                        isLoading={exchangeRateLoading}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="description">Description / Reason</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      placeholder="e.g., Product return, Discount adjustment..."
                      className="h-20"
                      data-testid="textarea-description"
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
                                  items={revenueAccountItems}
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
                                  data-testid={`input-line-description-${index}`}
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
                                  data-testid={`input-line-quantity-${index}`}
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
                                  data-testid={`input-line-unitPrice-${index}`}
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  readOnly
                                  value={form.getValues(`lineItems.${index}.amount`).toFixed(2)}
                                  className="text-right bg-muted"
                                  data-testid={`input-line-amount-${index}`}
                                />
                              </td>
                              <td className="p-2">
                                <FormField
                                  control={form.control}
                                  name={`lineItems.${index}.salesTaxId`}
                                  render={({ field }) => (
                                    <Select
                                      value={field.value?.toString() || "0"}
                                      onValueChange={(value) => {
                                        field.onChange(value === "0" ? null : parseInt(value));
                                        updateTotals();
                                      }}
                                    >
                                      <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select tax" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {salesTaxes?.filter(tax => !tax.parentId).map((tax) => (
                                          <SelectItem key={tax.id} value={tax.id.toString()}>
                                            {tax.name} ({tax.rate}%)
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </td>
                              <td className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeLineItem(index)}
                                  data-testid={`button-remove-line-${index}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
                      data-testid="button-add-line"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Line
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <div className="w-full md:w-1/3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span data-testid="text-subtotal">${(form.watch("subTotal") || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax:</span>
                        <span data-testid="text-tax">${(form.watch("taxAmount") || 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total Credit:</span>
                        <span data-testid="text-total">${(form.watch("totalAmount") || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </form>
      </Form>

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        onConfirm={handleExchangeRateUpdate}
        fromCurrency={customerCurrency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={creditDate}
      />
    </div>
  );
}
