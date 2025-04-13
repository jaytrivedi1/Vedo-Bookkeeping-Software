import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice, invoiceSchema, Contact, SalesTax } from "@shared/schema";
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

interface InvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

export default function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [subTotal, setSubTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [salesTaxId, setSalesTaxId] = useState<number | undefined>(undefined);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const { toast } = useToast();

  // Extract next invoice number
  const today = new Date();
  const defaultInvoiceNumber = `1001`;

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: today,
      contactId: undefined,
      reference: `INV-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`,
      description: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const createInvoice = useMutation({
    mutationFn: async (data: Invoice) => {
      return await apiRequest('POST', '/api/invoices', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) onSuccess();
      
      if (sendInvoiceEmail && selectedContact?.email) {
        toast({
          title: "Invoice sent",
          description: `Invoice has been sent to ${selectedContact.email}`,
        });
      }
    },
  });

  const calculateLineItemAmount = (quantity: number, unitPrice: number) => {
    return parseFloat((quantity * unitPrice).toFixed(2));
  };

  const recalculateLineItemAmounts = () => {
    const lineItems = form.getValues('lineItems');
    
    lineItems.forEach((item, index) => {
      const amount = calculateLineItemAmount(item.quantity, item.unitPrice);
      form.setValue(`lineItems.${index}.amount`, amount);
    });
    
    calculateTotals();
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

  const updateLineItemAmount = (index: number) => {
    const { quantity, unitPrice } = form.getValues(`lineItems.${index}`);
    const amount = calculateLineItemAmount(quantity, unitPrice);
    form.setValue(`lineItems.${index}.amount`, amount);
    calculateTotals();
  };

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
  }, [form.watch, paymentTerms]);

  const onSubmit = (data: Invoice) => {
    // Add the calculated totals and payment terms to the invoice data before submitting
    const enrichedData = {
      ...data,
      // Make sure we're passing Date objects and not strings
      date: data.date instanceof Date ? data.date : new Date(data.date),
      dueDate: dueDate instanceof Date ? dueDate : new Date(dueDate),
      status: 'draft' as const, // Default status since we removed the field
      subTotal,
      taxRate,
      taxAmount,
      totalAmount,
      paymentTerms,
      // Only include salesTaxId if it has a value (convert null to undefined)
      ...(salesTaxId ? { salesTaxId } : {})
    };
    
    // Ensure the line items have the correct amount calculated
    enrichedData.lineItems = enrichedData.lineItems.map(item => ({
      ...item,
      amount: calculateLineItemAmount(item.quantity, item.unitPrice)
    }));
    
    createInvoice.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium">Invoice no.{defaultInvoiceNumber}</h1>
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

        <div className="p-6">
          {/* Main content area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="md:col-span-2 space-y-6">
              {/* Customer section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center mb-1">
                          <FormLabel className="text-sm font-medium">Customer</FormLabel>
                          <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                        </div>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(parseInt(value));
                            handleContactChange(parseInt(value));
                          }} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {contactsLoading ? (
                              <SelectItem value="loading" disabled>Loading contacts...</SelectItem>
                            ) : contacts && contacts.length > 0 ? (
                              contacts
                                .filter(contact => contact.type === 'customer' || contact.type === 'both')
                                .map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id.toString()}>
                                    {contact.name}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="none" disabled>No customers available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <FormLabel className="text-sm font-medium">Customer email</FormLabel>
                    <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                  </div>
                  <Input 
                    className="bg-white border-gray-300" 
                    placeholder="Separate emails with a comma"
                    value={selectedContact?.email || ''}
                    readOnly
                  />
                  
                  <div className="flex items-center mt-2 space-x-2">
                    <Checkbox 
                      id="send-invoice" 
                      checked={sendInvoiceEmail}
                      onCheckedChange={(checked) => setSendInvoiceEmail(checked as boolean)}
                    />
                    <label
                      htmlFor="send-invoice"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Send later
                    </label>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
              
              {/* Billing section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FormLabel className="text-sm font-medium block mb-1">Billing address</FormLabel>
                  <Textarea 
                    className="h-24 bg-white border-gray-300" 
                    value={selectedContact?.address || ''}
                    readOnly
                  />
                </div>
                
                <div>
                  <div className="flex items-center mb-1">
                    <FormLabel className="text-sm font-medium">Terms</FormLabel>
                    <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                  </div>
                  <Select 
                    value={paymentTerms} 
                    onValueChange={(value) => handlePaymentTermsChange(value as PaymentTerms)}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select payment terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Net 7</SelectItem>
                      <SelectItem value="14">Net 14</SelectItem>
                      <SelectItem value="30">Net 30</SelectItem>
                      <SelectItem value="60">Net 60</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-3 text-xs text-blue-600">
                    <button type="button" className="underline">Create recurring invoice</button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <FormLabel className="text-sm font-medium block mb-1">Invoice date</FormLabel>
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Input
                                  className="bg-white border-gray-300"
                                  value={field.value ? format(field.value, "dd/MM/yyyy") : ""}
                                  readOnly
                                />
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
                  
                  <div>
                    <FormLabel className="text-sm font-medium block mb-1">Due date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Input
                          className="bg-white border-gray-300"
                          value={format(dueDate, "dd/MM/yyyy")}
                          readOnly
                        />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={(date) => date && setDueDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              
              {/* Tags */}
              <div>
                <div className="flex items-center mb-1">
                  <FormLabel className="text-sm font-medium">Tags</FormLabel>
                  <HelpCircle className="h-4 w-4 ml-1 text-gray-400" />
                </div>
                <Input 
                  className="bg-white border-gray-300" 
                  placeholder="Start typing to add a tag" 
                />
                <div className="flex justify-end mt-1">
                  <button type="button" className="text-xs text-blue-600 underline">Manage tags</button>
                </div>
              </div>
              
              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">Amounts are</div>
                  <Select defaultValue="exclusive">
                    <SelectTrigger className="w-40 bg-white border-gray-300">
                      <SelectValue placeholder="Tax setting" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                      <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                      <SelectItem value="no-tax">No Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border rounded-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 grid grid-cols-12 text-xs font-medium p-2 border-b">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">PRODUCT/SERVICE</div>
                    <div className="col-span-3">DESCRIPTION</div>
                    <div className="col-span-1 text-center">QTY</div>
                    <div className="col-span-1 text-center">RATE (CAD)</div>
                    <div className="col-span-1 text-center">AMOUNT (CAD)</div>
                    <div className="col-span-1 text-center">SALES TAX</div>
                  </div>
                  
                  {/* Line Items */}
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 p-2 border-b items-center hover:bg-gray-50">
                      <div className="col-span-1 text-center">{index + 1}</div>
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  className="bg-transparent border-0 p-1 focus:ring-0" 
                                  placeholder="Enter item name" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-3">
                        <Input 
                          className="bg-transparent border-0 p-1 focus:ring-0" 
                          placeholder="Enter description" 
                        />
                      </div>
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  className="bg-transparent border-0 p-1 text-center focus:ring-0" 
                                  type="number" 
                                  min="0"
                                  step="1"
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
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  className="bg-transparent border-0 p-1 text-center focus:ring-0" 
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
                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  className="bg-transparent border-0 p-1 text-center focus:ring-0" 
                                  readOnly
                                  value={field.value.toFixed(2)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (fields.length > 1) {
                              remove(index);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}
                  >
                    Add lines
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fields.length > 1) {
                        remove();
                      }
                    }}
                  >
                    Clear all lines
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                  >
                    Add subtotal
                  </Button>
                </div>
                
                {/* Totals */}
                <div className="flex justify-end mt-4">
                  <div className="w-48 space-y-1 text-right">
                    <div className="flex justify-between">
                      <span className="text-sm">Subtotal</span>
                      <span>${subTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>Balance due</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Invoice message */}
              <div>
                <FormLabel className="text-sm font-medium block mb-1">Message on invoice</FormLabel>
                <Textarea 
                  className="h-24 bg-white border-gray-300" 
                  placeholder="Personal notes on this invoice."
                />
              </div>
            </div>
            
            {/* Right column - Invoice details */}
            <div>
              <div className="mb-6 text-right">
                <div className="text-gray-500 mb-1">BALANCE DUE</div>
                <div className="text-2xl font-medium">${totalAmount.toFixed(2)}</div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <FormLabel className="text-sm font-medium block mb-1">Invoice no.</FormLabel>
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            className="bg-white border-gray-300" 
                            {...field}
                            value={defaultInvoiceNumber} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add padding at the bottom to ensure content doesn't get hidden behind the fixed footer */}
        <div className="pb-24"></div>
        
        {/* Fixed footer */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-gray-50 py-4 px-4 md:px-6 flex flex-col md:flex-row gap-3 justify-between z-50 shadow-md">
          <Button type="button" variant="outline" onClick={onCancel} className="md:w-auto w-full">
            Cancel
          </Button>
          
          <div className="flex flex-wrap md:flex-nowrap gap-2 md:space-x-2">
            <div className="flex md:hidden w-full justify-end">
              {/* Mobile save button */}
              <Button 
                type="submit"
                disabled={createInvoice.isPending}
                className="w-full md:w-auto"
              >
                {createInvoice.isPending ? 'Saving...' : 'Save and send'}
              </Button>
            </div>
            
            <div className="hidden md:flex md:space-x-2 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex">
                Print or Preview
              </Button>
              <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex">
                Make recurring
              </Button>
              <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex">
                Customize
              </Button>
              
              <div className="flex">
                <Button 
                  type="submit"
                  disabled={createInvoice.isPending}
                >
                  {createInvoice.isPending ? 'Saving...' : 'Save'}
                </Button>
                <div className="relative ml-px">
                  <Select 
                    defaultValue="save" 
                    onValueChange={(value) => {
                      if (value === "save_send") {
                        setSendInvoiceEmail(true);
                        form.handleSubmit(onSubmit)();
                      }
                    }}
                  >
                    <SelectTrigger className="px-2 rounded-l-none h-10 border-l-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value="save">Save</SelectItem>
                      <SelectItem value="save_send">Save and send</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
