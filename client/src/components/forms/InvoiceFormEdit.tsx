import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice, invoiceSchema, Contact, SalesTax, Product, Transaction, LineItem } from "@shared/schema";
import { CalendarIcon, Plus, Trash2, SendIcon, XIcon, HelpCircle, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

interface InvoiceFormEditProps {
  invoice: Transaction;
  lineItems: LineItem[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvoiceFormEdit({ invoice, lineItems, onSuccess, onCancel }: InvoiceFormEditProps) {
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Ensure products are properly typed
  const typedProducts = products?.map(product => ({
    ...product,
    price: typeof product.price === 'number' ? product.price : 0
  })) || [];

  // Find default selected contact
  useEffect(() => {
    if (contacts && invoice.contactId) {
      const contact = contacts.find(c => c.id === invoice.contactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [contacts, invoice.contactId]);

  // Set initial form values based on the invoice data
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: new Date(invoice.date),
      contactId: invoice.contactId || undefined,
      reference: invoice.reference,
      description: invoice.description || '',
      status: invoice.status as any,
      lineItems: lineItems.length > 0 
        ? lineItems.map(item => ({ 
            description: item.description, 
            quantity: item.quantity, 
            unitPrice: item.unitPrice, 
            amount: item.amount,
            salesTaxId: item.salesTaxId || undefined
          }))
        : [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Calculate subtotal, tax amount, and total when line items change
  useEffect(() => {
    const values = form.getValues();
    const items = values.lineItems || [];
    
    const calculatedSubTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    setSubTotal(calculatedSubTotal);
    
    // Calculate tax amount based on the sales tax rates of each line item
    let calculatedTaxAmount = 0;
    const taxNamesArray: string[] = [];
    
    if (salesTaxes) {
      items.forEach(item => {
        if (item.salesTaxId) {
          const tax = salesTaxes.find(t => t.id === item.salesTaxId);
          if (tax) {
            const itemTax = (item.amount || 0) * (tax.rate / 100);
            calculatedTaxAmount += itemTax;
            
            if (!taxNamesArray.includes(tax.name)) {
              taxNamesArray.push(tax.name);
            }
          }
        }
      });
    }
    
    setTaxAmount(calculatedTaxAmount);
    setTotalAmount(calculatedSubTotal + calculatedTaxAmount);
    setTaxNames(taxNamesArray);
    
    // Update form fields
    form.setValue('subTotal', calculatedSubTotal);
    form.setValue('taxAmount', calculatedTaxAmount);
    form.setValue('totalAmount', calculatedSubTotal + calculatedTaxAmount);
  }, [form.watch('lineItems'), salesTaxes]);

  const updateInvoice = useMutation({
    mutationFn: async (data: Invoice) => {
      console.log("Updating invoice with data:", JSON.stringify(data, null, 2));
      return await apiRequest(`/api/invoices/${invoice.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "Invoice has been updated successfully",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) onSuccess();
      
      if (sendInvoiceEmail && selectedContact?.email) {
        toast({
          title: "Invoice sent",
          description: `Invoice has been sent to ${selectedContact.email}`,
        });
      }
    },
    onError: (error: any) => {
      console.error("Error updating invoice:", error);
      toast({
        title: "Error updating invoice",
        description: error?.message || "There was a problem updating the invoice. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: Invoice) => {
    // Enrich data with calculated values
    const enrichedData = {
      ...data,
      subTotal,
      taxAmount,
      totalAmount,
      dueDate,
      paymentTerms,
    };
    
    console.log("Form data before submit:", enrichedData);
    
    updateInvoice.mutate(enrichedData);
  };

  // Calculate line item amount when quantity or unit price changes
  const calculateLineItemAmount = (index: number) => {
    const values = form.getValues();
    const lineItem = values.lineItems[index];
    const amount = lineItem.quantity * lineItem.unitPrice;
    form.setValue(`lineItems.${index}.amount`, amount);
  };

  // Handle payment terms change
  const handlePaymentTermsChange = (value: string) => {
    setPaymentTerms(value as PaymentTerms);
    const days = parseInt(value);
    if (!isNaN(days)) {
      setDueDate(addDays(form.getValues().date, days));
    }
  };

  // Find product by ID
  const findProduct = (productId: number) => {
    return typedProducts.find(p => p.id === productId);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium">Edit Invoice - {invoice.reference}</h1>
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
        
        {/* Main content */}
        <div className="flex-1 overflow-auto bg-gray-50 p-6">
          <div className="max-w-5xl mx-auto">
            {/* Invoice Form */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Customer info section */}
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium mb-4">Customer Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="contactId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Customer</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                const contact = contacts?.find(c => c.id === parseInt(value));
                                setSelectedContact(contact || null);
                              }}
                              disabled={contactsLoading}
                            >
                              <SelectTrigger className="bg-white border-gray-300">
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {contacts?.map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id.toString()}>
                                    {contact.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {selectedContact && (
                      <div className="mt-2 text-sm text-gray-600">
                        <p>{selectedContact.contactName}</p>
                        <p>{selectedContact.email}</p>
                        <p>{selectedContact.phone}</p>
                        <p>{selectedContact.address}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex flex-col gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-sm font-medium">Invoice Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="bg-white border-gray-300 text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={(date) => {
                                    field.onChange(date);
                                    // Update due date based on payment terms
                                    if (date && paymentTerms !== 'custom') {
                                      const days = parseInt(paymentTerms);
                                      setDueDate(addDays(date, days));
                                    }
                                  }}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FormLabel className="text-sm font-medium block mb-1">Payment Terms</FormLabel>
                          <Select
                            value={paymentTerms}
                            onValueChange={handlePaymentTermsChange}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">Net 7</SelectItem>
                              <SelectItem value="14">Net 14</SelectItem>
                              <SelectItem value="30">Net 30</SelectItem>
                              <SelectItem value="60">Net 60</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <FormLabel className="text-sm font-medium block mb-1">Due Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full bg-white border-gray-300 text-left font-normal justify-start"
                              >
                                {format(dueDate, "PPP")}
                                <CalendarIcon className="ml-auto h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={dueDate}
                                onSelect={(date) => {
                                  if (date) {
                                    setDueDate(date);
                                    setPaymentTerms('custom');
                                  }
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="reference"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Invoice Number</FormLabel>
                              <FormControl>
                                <Input 
                                  className="bg-white border-gray-300" 
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium">Status</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="bg-white border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="overdue">Overdue</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* File upload section */}
              <div className="p-6 border-b">
                <FormLabel className="text-sm font-medium block mb-1">Attach documents</FormLabel>
                <div className="border border-dashed border-gray-300 rounded p-4 text-center">
                  <div className="relative inline-block">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="mb-2"
                      onClick={() => document.getElementById('file-upload-invoice')?.click()}
                    >
                      Select files
                    </Button>
                    <input
                      type="file"
                      id="file-upload-invoice"
                      className="hidden"
                      multiple
                      onChange={(e) => {
                        // Handle file selection here
                        console.log("Files selected:", e.target.files);
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, or image files
                  </p>
                </div>
              </div>
              
              {/* Line items section */}
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium mb-4">Items</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
                          Description
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tax
                        </th>
                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fields.map((field, index) => (
                        <tr key={field.id}>
                          <td className="px-3 py-2">
                            <div className="flex flex-col space-y-1">
                              <FormField
                                control={form.control}
                                name={`lineItems.${index}.description`}
                                render={({ field }) => (
                                  <FormControl>
                                    <div className="relative">
                                      <Input 
                                        className="bg-white border-gray-300" 
                                        placeholder="Enter item description" 
                                        {...field} 
                                      />
                                      <div className="absolute inset-y-0 right-0 flex items-center">
                                        <Select
                                          onValueChange={(value) => {
                                            const product = findProduct(parseInt(value));
                                            if (product) {
                                              form.setValue(`lineItems.${index}.description`, product.name);
                                              form.setValue(`lineItems.${index}.unitPrice`, product.price);
                                              form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId);
                                              calculateLineItemAmount(index);
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="border-0 bg-transparent h-9 w-[35px] p-0 focus:ring-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                          </SelectTrigger>
                                          <SelectContent>
                                            {typedProducts.map((product) => (
                                              <SelectItem key={product.id} value={product.id.toString()}>
                                                {product.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </FormControl>
                                )}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.quantity`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input 
                                    className="bg-white border-gray-300 w-20" 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value));
                                      calculateLineItemAmount(index);
                                    }}
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.unitPrice`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input 
                                    className="bg-white border-gray-300 w-24" 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    {...field} 
                                    onChange={(e) => {
                                      field.onChange(parseFloat(e.target.value));
                                      calculateLineItemAmount(index);
                                    }}
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.salesTaxId`}
                              render={({ field }) => (
                                <FormControl>
                                  <Select
                                    value={field.value?.toString() || "0"}
                                    onValueChange={(value) => {
                                      field.onChange(value === "0" ? undefined : parseInt(value));
                                    }}
                                    disabled={salesTaxesLoading}
                                  >
                                    <SelectTrigger className="bg-white border-gray-300 w-32">
                                      <SelectValue placeholder="No tax" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">No tax</SelectItem>
                                      {salesTaxes?.map((tax) => (
                                        <SelectItem key={tax.id} value={tax.id.toString()}>
                                          {tax.name} ({tax.rate}%)
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <FormField
                              control={form.control}
                              name={`lineItems.${index}.amount`}
                              render={({ field }) => (
                                <FormControl>
                                  <Input 
                                    className="bg-white border-gray-300 w-24" 
                                    readOnly 
                                    value={field.value?.toFixed(2) || "0.00"} 
                                  />
                                </FormControl>
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 text-red-500"
                              onClick={() => {
                                if (fields.length > 1) {
                                  remove(index);
                                }
                              }}
                              disabled={fields.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-primary"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <div className="w-72">
                    <div className="flex justify-between py-2 text-sm">
                      <span className="font-medium text-gray-600">Subtotal:</span>
                      <span>${subTotal.toFixed(2)}</span>
                    </div>
                    {taxAmount > 0 && (
                      <div className="flex justify-between py-2 text-sm">
                        <span className="font-medium text-gray-600">
                          {taxNames.length > 0 ? taxNames.join(', ') : 'Tax'}:
                        </span>
                        <span>${taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 text-base font-semibold border-t mt-2 pt-2">
                      <span>Total:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes section */}
              <div className="p-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          className="bg-white border-gray-300" 
                          placeholder="Add any relevant notes or payment instructions" 
                          {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {selectedContact?.email && (
                  <div className="mt-4 flex items-center space-x-2">
                    <Checkbox 
                      id="send-email" 
                      className="data-[state=checked]:bg-primary"
                      checked={sendInvoiceEmail}
                      onCheckedChange={(value) => setSendInvoiceEmail(value === true)}
                    />
                    <label
                      htmlFor="send-email"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send to customer ({selectedContact.email})
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer - Save button section */}
        <div className="bg-white border-t px-4 py-3 flex items-center justify-between sticky bottom-0 z-10">
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
            
            <div className="text-sm text-gray-500">
              Last edited on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              className="text-primary border-primary"
            >
              Preview
            </Button>
            
            {selectedContact?.email && (
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white space-x-1"
                onClick={() => {
                  setSendInvoiceEmail(true);
                  // Save the form will happen with submit
                }}
              >
                <SendIcon className="h-4 w-4" />
                <span>Send & Save</span>
              </Button>
            )}
            
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-white"
              disabled={updateInvoice.isPending}
            >
              {updateInvoice.isPending ? "Saving..." : "Save and Close"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}