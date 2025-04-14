import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Expense, expenseSchema, Contact, SalesTax } from "@shared/schema";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";

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

interface ExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const [calculatingTotals, setCalculatingTotals] = useState(false);
  const [taxRate, setTaxRate] = useState(0);
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  const form = useForm<Expense>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      contactId: undefined,
      reference: `EXP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
      description: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const createExpense = useMutation({
    mutationFn: async (data: Expense) => {
      return await apiRequest('/api/expenses', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) onSuccess();
    },
  });

  const calculateLineItemAmount = (quantity: number, unitPrice: number) => {
    return parseFloat((quantity * unitPrice).toFixed(2));
  };

  const calculateTotals = () => {
    const lineItems = form.getValues('lineItems');
    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    setSubTotal(subtotal);
    setTaxAmount(tax);
    setTotalAmount(total);
  };

  const recalculateLineItemAmounts = () => {
    setCalculatingTotals(true);
    const lineItems = form.getValues('lineItems');
    
    lineItems.forEach((item, index) => {
      const amount = calculateLineItemAmount(item.quantity, item.unitPrice);
      form.setValue(`lineItems.${index}.amount`, amount);
    });
    
    calculateTotals();
    setCalculatingTotals(false);
  };

  const onSubmit = (data: Expense) => {
    // Add the calculated totals and tax to the expense data
    const enrichedData = {
      ...data,
      status: 'pending' as const, // Default status since we removed the field
      subTotal,
      taxRate,
      taxAmount,
      totalAmount,
    };
    
    // Ensure the line items have the correct amount calculated
    enrichedData.lineItems = enrichedData.lineItems.map(item => ({
      ...item,
      amount: calculateLineItemAmount(item.quantity, item.unitPrice)
    }));
    
    createExpense.mutate(enrichedData);
  };

  const updateLineItemAmount = (index: number) => {
    const { quantity, unitPrice } = form.getValues(`lineItems.${index}`);
    const amount = calculateLineItemAmount(quantity, unitPrice);
    form.setValue(`lineItems.${index}.amount`, amount);
    calculateTotals();
  };
  
  // Update totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [fields]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="EXP-YYYY-MM" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vendor</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contactsLoading ? (
                      <SelectItem value="loading" disabled>Loading contacts...</SelectItem>
                    ) : contacts && contacts.length > 0 ? (
                      contacts
                        .filter(contact => contact.type === 'vendor' || contact.type === 'both')
                        .map((contact) => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.name}
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
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Expense description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />



          <div>
            <h3 className="text-md font-medium mb-2">Line Items</h3>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-5">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Description</FormLabel>}
                        <FormControl>
                          <Input placeholder="Item description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Qty</FormLabel>}
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                              updateLineItemAmount(index);
                            }}
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
                    name={`lineItems.${index}.unitPrice`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Price</FormLabel>}
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                              updateLineItemAmount(index);
                            }}
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
                    name={`lineItems.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        {index === 0 && <FormLabel>Amount</FormLabel>}
                        <FormControl>
                          <Input 
                            type="number" 
                            readOnly 
                            value={field.value} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line Item
            </Button>
          </div>

          {/* Totals and Sales Tax */}
          <div className="border rounded-md p-4 mt-4">
            <h3 className="text-md font-medium mb-3">Totals</h3>
            <div className="w-full md:w-1/2 ml-auto space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Subtotal:</span>
                <span>${subTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Sales Tax:</span>
                <div className="w-48">
                  <Select
                    value={taxRate.toString()}
                    onValueChange={(value) => {
                      setTaxRate(parseFloat(value) || 0);
                      calculateTotals();
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select tax rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None (0%)</SelectItem>
                      {salesTaxesLoading ? (
                        <SelectItem value="loading" disabled>Loading tax rates...</SelectItem>
                      ) : salesTaxes && salesTaxes.length > 0 ? (
                        salesTaxes
                          .filter(tax => tax.isActive)
                          .map((tax) => (
                            <SelectItem key={tax.id} value={tax.rate.toString()}>
                              {tax.name} ({tax.rate}%)
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="none" disabled>No tax rates available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm">Tax Amount:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              <Button 
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
            <div>
              <Button 
                type="button"
                variant="outline"
                className="mr-2"
                onClick={recalculateLineItemAmounts}
              >
                Recalculate
              </Button>
              <Button 
                type="submit"
                disabled={createExpense.isPending}
              >
                {createExpense.isPending ? 'Saving...' : 'Save Expense'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
