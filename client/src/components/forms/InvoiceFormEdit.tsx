import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice, invoiceSchema, Contact, SalesTax, Product, Transaction, LineItem } from "@shared/schema";
import { CalendarIcon, Plus, Trash2, SendIcon, XIcon, HelpCircle, Settings, Printer, File } from "lucide-react";

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
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Payment terms options
type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

// Extended transaction type for invoices
interface InvoiceTransaction extends Transaction {
  dueDate?: string | Date;
}

interface InvoiceFormEditProps {
  invoice: InvoiceTransaction;
  lineItems: LineItem[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvoiceFormEdit({ invoice, lineItems, onSuccess, onCancel }: InvoiceFormEditProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [dueDate, setDueDate] = useState<Date>(
    invoice.dueDate ? new Date(invoice.dueDate) : addDays(new Date(), 30)
  );
  
  const { toast } = useToast();

  // Get contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Get sales taxes
  const { data: salesTaxes = [] } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Get products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  // Create initial form values from existing invoice and line items
  const defaultValues: Invoice = {
    reference: invoice.reference,
    date: invoice.date ? new Date(invoice.date) : new Date(),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
    description: invoice.description || "",
    status: (invoice.status as any) || "draft",
    contactId: invoice.contactId || 0,
    lineItems: lineItems.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      salesTaxId: item.salesTaxId || 0
    })),
    subTotal: lineItems.reduce((sum, item) => sum + item.amount, 0),
    taxAmount: lineItems.reduce((sum, item) => {
      const salesTax = salesTaxes && Array.isArray(salesTaxes) 
        ? salesTaxes.find((tax: any) => tax.id === item.salesTaxId)
        : null;
      return sum + (salesTax ? item.amount * (salesTax.rate / 100) : 0);
    }, 0),
    totalAmount: invoice.amount,
    paymentTerms: "30"
  };

  // Initialize form
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
    mode: "onChange"
  });

  // Access form line items as a field array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems"
  });

  // Calculate totals - subtotal, tax amount, total
  const calculateTotals = () => {
    const lineItems = form.getValues('lineItems');
    const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    // Calculate tax amount based on the per-line item tax rates
    let totalTaxAmount = 0;
    const usedTaxes = new Map<number, SalesTax>();
    
    // Loop through each line item and calculate its tax
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        // Find the tax rate for this line item
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          const itemTaxRate = salesTax.rate;
          const itemTaxAmount = (item.amount || 0) * (itemTaxRate / 100);
          totalTaxAmount += itemTaxAmount;
          
          // Track which taxes are being used
          usedTaxes.set(salesTax.id, salesTax);
        }
      }
    });
    
    const total = subtotal + totalTaxAmount;
    
    // Get all unique tax names used in this invoice
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    
    // Update state
    setSubTotal(subtotal);
    setTaxAmount(totalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
    
    // Update form values for submission
    form.setValue('subTotal', subtotal);
    form.setValue('taxAmount', totalTaxAmount);
    form.setValue('totalAmount', total);
  };

  // Add a new line item
  const addLineItem = () => {
    append({
      description: "",
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      salesTaxId: 0
    });
  };

  // Handle item selection
  const handleProductSelect = (index: number, productId: number) => {
    if (!productId) return;
    
    const product = Array.isArray(products) 
      ? products.find((p: Product) => p.id === productId) 
      : null;
    if (!product) return;

    const currentValues = form.getValues(`lineItems.${index}`);
    form.setValue(`lineItems.${index}.description`, product.name);
    form.setValue(`lineItems.${index}.unitPrice`, typeof product.price === 'number' ? product.price : 0);
    form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId || 0);
    
    // Recalculate amount
    const price = typeof product.price === 'number' ? product.price : 0;
    const amount = price * (currentValues.quantity || 0);
    form.setValue(`lineItems.${index}.amount`, amount);
    
    // Update totals
    calculateTotals();
  };

  // Calculate amount when quantity or unit price changes
  const updateLineItemAmount = (index: number) => {
    const lineItem = form.getValues(`lineItems.${index}`);
    const amount = (lineItem.quantity || 0) * (lineItem.unitPrice || 0);
    form.setValue(`lineItems.${index}.amount`, amount);
    calculateTotals();
  };

  // Handle payment terms change
  const handlePaymentTermsChange = (value: PaymentTerms) => {
    setPaymentTerms(value);
    
    // Update due date based on payment terms
    const invoiceDate = form.getValues('date');
    let newDueDate: Date;
    
    if (value === 'custom') {
      // Keep the current due date for custom
      newDueDate = dueDate;
    } else {
      // Add the number of days from payment terms
      const days = parseInt(value);
      newDueDate = addDays(invoiceDate, days);
    }
    
    setDueDate(newDueDate);
  };

  const handleContactChange = (contactId: number) => {
    if (!contacts) return;
    
    const contact = contacts.find(c => c.id === contactId);
    if (contact) {
      setSelectedContact(contact);
    }
  };

  // Update totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [fields]);

  // Update due date when invoice date changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'date' && value.date) {
        const days = paymentTerms === 'custom' ? 30 : parseInt(paymentTerms);
        setDueDate(addDays(value.date as Date, days));
      }
      
      if (name === 'contactId' && value.contactId) {
        handleContactChange(Number(value.contactId));
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, paymentTerms]);

  // Handle form submission
  const invoiceMutation = useMutation({
    mutationFn: async (data: Invoice) => {
      return apiRequest(`/api/invoices/${invoice.id || 0}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "Invoice was successfully updated.",
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Call success callback
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error updating invoice",
        description: error.message || "There was an error updating the invoice. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: Invoice) => {
    // Filter out empty line items
    const filteredLineItems = data.lineItems.filter(item => 
      item.description.trim() !== '' && 
      item.quantity > 0 && 
      item.unitPrice > 0
    );
    
    if (filteredLineItems.length === 0) {
      toast({
        title: "Cannot save invoice",
        description: "Please add at least one valid line item with description, quantity and price",
        variant: "destructive",
      });
      return;
    }
    
    // Add the calculated totals and payment terms to the invoice data before submitting
    const enrichedData = {
      ...data,
      // Make sure we're passing Date objects and not strings
      date: data.date instanceof Date ? data.date : new Date(data.date),
      dueDate: dueDate instanceof Date ? dueDate : new Date(dueDate),
      // Ensure required fields are present
      reference: data.reference || invoice.reference,
      status: 'draft' as const, // Default status since we removed the field
      description: data.description || '',
      subTotal,
      taxAmount,
      totalAmount,
      paymentTerms
    };
    
    // Calculate the line item amounts and ensure salesTaxId is properly handled
    enrichedData.lineItems = filteredLineItems.map(item => {
      // Calculate the correct amount for this line item
      const amount = (item.quantity || 0) * (item.unitPrice || 0);
      
      // Create a properly formatted line item
      const formattedItem: any = {
        ...item,
        amount: amount
      };
      
      // Add salesTaxId only if it exists and is not zero/undefined
      if (item.salesTaxId) {
        formattedItem.salesTaxId = item.salesTaxId;
      }
      
      return formattedItem;
    });
    
    invoiceMutation.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium">Invoice no.{invoice.reference}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon">
              <Settings className="h-5 w-5 text-gray-500" />
            </Button>
            <Button type="button" variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5 text-gray-500" />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
              <XIcon className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          {/* Main content area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="md:col-span-2 space-y-6">
              {/* Customer section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(parseInt(value));
                          handleContactChange(parseInt(value));
                        }}
                        value={field.value?.toString() || "0"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">None</SelectItem>
                          {contacts.map((contact: Contact) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              {contact.name} {contact.contactName ? `(${contact.contactName})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Invoice details section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Date and terms section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PP")
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
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handlePaymentTermsChange(value as PaymentTerms);
                        }}
                        value={field.value || "30"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="7">Net 7 Days</SelectItem>
                          <SelectItem value="14">Net 14 Days</SelectItem>
                          <SelectItem value="30">Net 30 Days</SelectItem>
                          <SelectItem value="60">Net 60 Days</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PP")
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
                            onSelect={(date) => {
                              field.onChange(date);
                              setDueDate(date || new Date());
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Line items */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12">Item Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">Quantity</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Tax</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-2/12">Amount</th>
                      <th className="px-6 py-3 text-right w-1/12"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {fields.map((field, index) => (
                      <tr key={field.id}>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <Select
                              onValueChange={(value) => handleProductSelect(index, parseInt(value))}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select product/service" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Custom Item</SelectItem>
                                {products.map((product: Product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.description`}
                              render={({ field }) => (
                                <FormItem className="mb-0">
                                  <FormControl>
                                    <Input {...field} placeholder="Description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number" 
                                    min="0" 
                                    step="1"
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      updateLineItemAmount(index);
                                    }}
                                    className="text-right" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number" 
                                    min="0" 
                                    step="0.01"
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value) || 0);
                                      updateLineItemAmount(index);
                                    }}
                                    className="text-right" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.salesTaxId`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <Select
                                  onValueChange={(value) => {
                                    field.onChange(parseInt(value));
                                    calculateTotals();
                                  }}
                                  value={field.value?.toString() || "0"}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="No Tax" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="0">No Tax</SelectItem>
                                    {salesTaxes.map((tax: SalesTax) => (
                                      <SelectItem key={tax.id} value={tax.id.toString()}>
                                        {tax.name} ({tax.rate}%)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    readOnly
                                    value={field.value?.toFixed(2) || "0.00"}
                                    className="text-right bg-gray-50" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="px-6 py-4 bg-gray-50">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLineItem}
                    className="flex items-center"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Line
                  </Button>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Summary card */}
              <div className="bg-white rounded-md border p-6 space-y-4">
                <h3 className="text-lg font-medium mb-4">Summary</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span>${subTotal.toFixed(2)}</span>
                  </div>
                  
                  {taxNames.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {taxNames.join(', ')}
                      </span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white p-4 border-t border-gray-200 shadow-sm mt-auto">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button type="button" variant="outline" size="sm">
                <File className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button type="button" variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Invoice"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}