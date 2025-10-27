import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Contact, SalesTax, Product, Account } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

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
  const { toast } = useToast();

  // Generate default receipt number
  const today = new Date();
  const defaultReceiptNumber = `SR-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

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
      label: contact.name,
      subtitle: `· ${contact.type}`
    }));

  const taxItems: SearchableSelectItem[] = salesTaxes
    .filter((tax: SalesTax) => !tax.parentId)
    .map((tax: SalesTax) => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    }));

  const depositAccountItems: SearchableSelectItem[] = depositAccounts.map((acc: Account) => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: acc.balance !== undefined ? `· ${formatCurrency(acc.balance)}` : undefined
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

  // Function to recalculate totals
  const recalculateTotals = useCallback(() => {
    const currentLineItems = form.getValues("lineItems");
    let newSubTotal = 0;
    let newTaxAmount = 0;

    currentLineItems.forEach((item, index) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const lineTotal = roundTo2Decimals(quantity * unitPrice);
      
      // Update the amount in the form
      form.setValue(`lineItems.${index}.amount`, lineTotal, { shouldValidate: false });
      
      newSubTotal += lineTotal;

      // Calculate tax for this line item
      if (item.salesTaxId) {
        const tax = salesTaxes.find((t: SalesTax) => t.id === item.salesTaxId);
        if (tax) {
          const lineTax = roundTo2Decimals((lineTotal * (tax.rate || 0)) / 100);
          newTaxAmount += lineTax;
        }
      }
    });

    setSubTotal(roundTo2Decimals(newSubTotal));
    setTaxAmount(roundTo2Decimals(newTaxAmount));
    setTotalAmount(roundTo2Decimals(newSubTotal + newTaxAmount));
  }, [form, salesTaxes]);

  const createSalesReceiptMutation = useMutation({
    mutationFn: async (data: SalesReceiptFormData) => {
      return await apiRequest('/api/sales-receipts', 'POST', {
        ...data,
        subTotal,
        taxAmount,
        totalAmount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Sales receipt created successfully",
      });
      if (onSuccess) onSuccess();
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
      form.setValue(`lineItems.${index}.unitPrice`, product.price || 0);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer */}
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer (Optional)</FormLabel>
                <FormControl>
                  <SearchableSelect
                    items={customerItems}
                    value={field.value?.toString() || ''}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    placeholder="Select customer (optional)"
                    searchPlaceholder="Search customers..."
                    emptyText="No customers found."
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
                <FormLabel>Receipt Number *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-receipt-number" />
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
                <FormLabel>Date *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-date"
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
                <FormLabel>Payment Method *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-payment-method">
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
                <FormLabel>Deposit To *</FormLabel>
                <FormControl>
                  <SearchableSelect
                    items={depositAccountItems}
                    value={field.value?.toString() || ''}
                    onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                    placeholder="Select account"
                    searchPlaceholder="Search accounts..."
                    emptyText="No accounts found."
                    data-testid="select-deposit-account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined })}
              data-testid="button-add-line-item"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </Button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-start p-4 border rounded-lg">
                {/* Product/Service */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-sm font-medium">Product/Service</label>
                  <Select
                    value={form.watch(`lineItems.${index}.productId`) || ''}
                    onValueChange={(value) => handleProductSelect(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product: Product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="col-span-12 md:col-span-3">
                  <label className="text-sm font-medium">Description *</label>
                  <Input
                    {...form.register(`lineItems.${index}.description`)}
                    placeholder="Item description"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-3 md:col-span-1">
                  <label className="text-sm font-medium">Qty *</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register(`lineItems.${index}.quantity`, { 
                      valueAsNumber: true,
                      onChange: recalculateTotals 
                    })}
                  />
                </div>

                {/* Unit Price */}
                <div className="col-span-3 md:col-span-2">
                  <label className="text-sm font-medium">Price *</label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register(`lineItems.${index}.unitPrice`, { 
                      valueAsNumber: true,
                      onChange: recalculateTotals 
                    })}
                  />
                </div>

                {/* Tax */}
                <div className="col-span-3 md:col-span-2">
                  <label className="text-sm font-medium">Tax</label>
                  <Select
                    value={form.watch(`lineItems.${index}.salesTaxId`)?.toString() || ''}
                    onValueChange={(value) => {
                      form.setValue(`lineItems.${index}.salesTaxId`, value ? Number(value) : undefined);
                      recalculateTotals();
                    }}
                  >
                    <SelectTrigger>
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
                  <label className="text-sm font-medium">Amount</label>
                  <Input
                    value={formatCurrency(form.watch(`lineItems.${index}.amount`) || 0)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                {/* Delete Button */}
                {fields.length > 1 && (
                  <div className="col-span-1 flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax:</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Memo */}
        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Memo (Internal Note)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Optional note for internal reference..."
                  className="resize-none"
                  rows={3}
                  {...field}
                  data-testid="textarea-memo"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
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
            disabled={createSalesReceiptMutation.isPending}
            data-testid="button-submit"
          >
            {createSalesReceiptMutation.isPending ? "Saving..." : "Save Sales Receipt"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
