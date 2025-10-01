import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { expenseSchema, Contact, SalesTax, Account, Transaction } from "@shared/schema";
import { roundTo2Decimals } from "@shared/utils";
import { CalendarIcon, Plus, Trash2, XIcon } from "lucide-react";

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
  contactId: number;
  reference: string;
  description?: string;
  status: "open" | "completed" | "cancelled";
  paymentMethod: "cash" | "check" | "credit_card" | "bank_transfer" | "other";
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
  const { toast } = useToast();

  const defaultExpenseNumber = isEditing ? expense?.reference : `EXP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`;

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const vendors = contacts?.filter(contact => contact.type === 'vendor' || contact.type === 'both') || [];
  const expenseAccounts = accounts?.filter(account => 
    account.type === 'expenses' || account.type === 'cost_of_goods_sold'
  ) || [];
  const paymentAccounts = accounts?.filter(account => 
    account.type === 'bank' || account.type === 'credit_card'
  ) || [];

  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: isEditing ? {
      date: initialDate,
      contactId: expense?.contactId || undefined,
      reference: expense?.reference || '',
      description: expense?.description || '',
      status: (expense?.status as "open" | "completed" | "cancelled") || 'open',
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
      reference: defaultExpenseNumber,
      description: '',
      status: 'open' as const,
      paymentMethod: 'cash' as const,
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

  useEffect(() => {
    if (isEditing && lineItems?.length && expense) {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxTotal = (expense.amount || 0) - subtotal;
      
      setSubTotal(subtotal);
      setTaxAmount(taxTotal);
      setTotalAmount(expense.amount || 0);
    }
  }, [isEditing, lineItems, expense]);

  const saveExpense = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        console.log("Updating expense with data:", JSON.stringify(data, null, 2));
        return await apiRequest(`/api/expenses/${expense?.id}`, 'PATCH', data);
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
      if (onSuccess) onSuccess();
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

  const calculateTotals = (manualTaxOverride?: number | null) => {
    const lineItems = form.getValues('lineItems');
    const subtotal = roundTo2Decimals(lineItems.reduce((sum, item) => sum + (item.amount || 0), 0));
    
    let totalTaxAmount = 0;
    const taxComponents = new Map<number, TaxComponentInfo>();
    
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            if (components.length > 0) {
              components.forEach(component => {
                const componentTaxAmount = roundTo2Decimals((item.amount || 0) * (component.rate / 100));
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
            } else {
              const itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
              totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
              
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
            const itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
            totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
            
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
      }
    });
    
    const finalTaxAmount = manualTaxOverride !== undefined 
      ? (manualTaxOverride === null ? totalTaxAmount : manualTaxOverride)
      : (manualTaxAmount !== null ? manualTaxAmount : totalTaxAmount);
    const total = roundTo2Decimals(subtotal + finalTaxAmount);
    
    const taxComponentsArray = Array.from(taxComponents.values());
    form.taxComponentsInfo = taxComponentsArray;
    
    setSubTotal(subtotal);
    setTaxAmount(finalTaxAmount);
    setTotalAmount(total);
  };

  const updateLineItemAmount = (index: number) => {
    calculateTotals();
  };

  useEffect(() => {
    calculateTotals();
  }, [fields.length]);

  const onSubmit = (data: Expense) => {
    const enrichedData = {
      ...data,
      type: 'expense' as const,
      amount: totalAmount,
      subTotal,
      taxAmount,
      balance: totalAmount,
      lineItems: data.lineItems.map(item => ({
        ...item,
        accountId: item.accountId || null,
        salesTaxId: item.salesTaxId || null,
      }))
    };
    
    console.log("Submitting expense data:", enrichedData);
    saveExpense.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payee</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                  data-testid="select-payee"
                >
                  <FormControl>
                    <SelectTrigger data-testid="trigger-payee">
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contactsLoading ? (
                      <SelectItem value="loading" disabled>Loading vendors...</SelectItem>
                    ) : vendors.length > 0 ? (
                      vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id.toString()} data-testid={`vendor-${vendor.id}`}>
                          {vendor.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No vendors available</SelectItem>
                    )}
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
                <FormLabel>Payment Account</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                  data-testid="select-payment-account"
                >
                  <FormControl>
                    <SelectTrigger data-testid="trigger-payment-account">
                      <SelectValue placeholder="Select payment account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accountsLoading ? (
                      <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                    ) : paymentAccounts.length > 0 ? (
                      paymentAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()} data-testid={`payment-account-${account.id}`}>
                          {account.name} ({account.type})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No payment accounts available</SelectItem>
                    )}
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
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-payment-date"
                      >
                        {field.value ? (
                          format(field.value, "PPP")
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  data-testid="select-payment-method"
                >
                  <FormControl>
                    <SelectTrigger data-testid="trigger-payment-method">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cash" data-testid="method-cash">Cash</SelectItem>
                    <SelectItem value="check" data-testid="method-check">Check</SelectItem>
                    <SelectItem value="credit_card" data-testid="method-credit-card">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer" data-testid="method-bank-transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other" data-testid="method-other">Other</SelectItem>
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
                <FormLabel>Ref No.</FormLabel>
                <FormControl>
                  <Input placeholder="EXP-YYYY-MMDD" {...field} data-testid="input-reference" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Line Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 grid grid-cols-12 gap-2 p-3 font-medium text-sm">
              <div className="col-span-3">Account</div>
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Sales Tax</div>
              <div className="col-span-1"></div>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 p-3 border-t items-start">
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString()}
                          data-testid={`select-account-${index}`}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountsLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : expenseAccounts.length > 0 ? (
                              expenseAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()} data-testid={`account-${account.id}-${index}`}>
                                  {account.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No expense accounts</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-4">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Description" {...field} data-testid={`input-description-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-2">
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
                
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.salesTaxId`}
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value === "none" ? undefined : parseInt(value));
                            updateLineItemAmount(index);
                          }}
                          value={field.value?.toString() || "none"}
                          data-testid={`select-tax-${index}`}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {salesTaxesLoading ? (
                              <SelectItem value="loading" disabled>Loading...</SelectItem>
                            ) : salesTaxes && salesTaxes.length > 0 ? (
                              salesTaxes
                                .filter(tax => tax.isActive)
                                .map((tax) => (
                                  <SelectItem key={tax.id} value={tax.id.toString()} data-testid={`tax-${tax.id}-${index}`}>
                                    {tax.name} ({tax.rate}%)
                                  </SelectItem>
                                ))
                            ) : null}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="col-span-1 flex items-center justify-end">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => append({ accountId: undefined, description: '', amount: 0, salesTaxId: undefined })}
            data-testid="button-add-line-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Totals</h3>
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium" data-testid="text-subtotal">${subTotal.toFixed(2)}</span>
            </div>
            
            {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 && (
              <div className="space-y-2">
                {form.taxComponentsInfo.map((taxInfo) => (
                  <div key={taxInfo.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {taxInfo.name} ({taxInfo.rate}%):
                    </span>
                    <span data-testid={`text-tax-${taxInfo.id}`}>${taxInfo.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm">
              <span>Tax Amount:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualTaxAmount !== null ? manualTaxAmount : taxAmount}
                  onChange={(e) => {
                    const value = e.target.value === '' ? null : parseFloat(e.target.value);
                    setManualTaxAmount(value);
                    calculateTotals(value);
                  }}
                  className="w-24 h-8 text-right"
                  data-testid="input-manual-tax"
                />
                {manualTaxAmount !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setManualTaxAmount(null);
                      calculateTotals(null);
                    }}
                    data-testid="button-reset-tax"
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="border-t pt-3 flex justify-between font-bold text-base">
              <span>Total:</span>
              <span data-testid="text-total">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Memo</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add notes or memo..." 
                  className="min-h-[80px]"
                  {...field} 
                  data-testid="textarea-memo"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4 bg-muted/30">
          <FormLabel className="text-sm text-muted-foreground">Attachments</FormLabel>
          <p className="text-sm text-muted-foreground mt-1">Attachment functionality coming soon</p>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={saveExpense.isPending}
            data-testid="button-save"
          >
            {saveExpense.isPending ? 'Saving...' : isEditing ? 'Update Expense' : 'Save Expense'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
