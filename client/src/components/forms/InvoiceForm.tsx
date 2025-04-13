import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice, invoiceSchema, Contact, SalesTax } from "@shared/schema";
import { CalendarIcon, Plus, Trash2, SendIcon } from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface InvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

export default function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [calculatingTotals, setCalculatingTotals] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [subTotal, setSubTotal] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [salesTaxId, setSalesTaxId] = useState<number | null>(null);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const { toast } = useToast();

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: new Date(),
      contactId: undefined,
      reference: `INV-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
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
    },
  });

  const calculateLineItemAmount = (quantity: number, unitPrice: number) => {
    return parseFloat((quantity * unitPrice).toFixed(2));
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

  const sendInvoice = () => {
    // Here you would typically implement email sending functionality
    toast({
      title: "Invoice sent",
      description: `Invoice has been sent to ${selectedContact?.email || "customer"}`,
    });
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
      salesTaxId
    };
    
    console.log("Submitting invoice:", enrichedData);
    
    // Ensure the line items have the correct amount calculated
    enrichedData.lineItems = enrichedData.lineItems.map(item => ({
      ...item,
      amount: calculateLineItemAmount(item.quantity, item.unitPrice)
    }));
    
    createInvoice.mutate(enrichedData);
  };

  // Form sections for navigation
  const formSections = [
    { id: 'customer-info', label: 'Customer Info' },
    { id: 'items', label: 'Line Items' },
    { id: 'totals', label: 'Totals & Submit' }
  ];
  
  const [activeSection, setActiveSection] = useState('customer-info');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Navigation Tabs */}
        <div className="flex mb-4 border-b">
          {formSections.map(section => (
            <Button 
              key={section.id}
              type="button"
              variant="ghost"
              className={cn(
                "rounded-none border-b-2 -mb-px px-4",
                activeSection === section.id 
                  ? "border-primary text-primary" 
                  : "border-transparent hover:border-gray-300"
              )}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Customer Info Section */}
          <div className={activeSection === 'customer-info' ? 'block' : 'hidden'}>
            {/* Header Section - Customer and Invoice Info */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Side - Customer Details */}
              <div className="space-y-3">
                <h3 className="text-md font-medium">Bill To:</h3>
                
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
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                
                {selectedContact && (
                  <Card className="bg-slate-50">
                    <CardContent className="p-2">
                      <p className="font-medium">{selectedContact.name}</p>
                      <p className="text-sm text-gray-600">{selectedContact.address || 'No address on file'}</p>
                      <p className="text-sm text-gray-600">{selectedContact.email}</p>
                      <p className="text-sm text-gray-600">{selectedContact.phone || 'No phone on file'}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Right Side - Invoice Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-YYYY-MM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Invoice Date</FormLabel>
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
                                  format(field.value, "MMM dd, yyyy")
                                ) : (
                                  <span>Select date</span>
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
                  
                  <div>
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {format(dueDate, "MMM dd, yyyy")}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
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
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select 
                      value={paymentTerms} 
                      onValueChange={(value) => handlePaymentTermsChange(value as PaymentTerms)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment terms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Net 7 Days</SelectItem>
                        <SelectItem value="14">Net 14 Days</SelectItem>
                        <SelectItem value="30">Net 30 Days</SelectItem>
                        <SelectItem value="60">Net 60 Days</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  

                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter details about this invoice" rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button 
                type="button" 
                onClick={() => setActiveSection('items')}
                className="flex items-center"
              >
                Next: Line Items
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </div>
          
          {/* Line Items Section */}
          <div className={activeSection === 'items' ? 'block' : 'hidden'}>
            <h3 className="text-md font-medium mb-2">Items</h3>
            
            <div className="rounded-md border overflow-hidden">
              {/* Header Row */}
              <div className="bg-slate-50 grid grid-cols-12 gap-2 p-2 border-b text-sm font-medium">
                <div className="col-span-5">Product/Service</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-center">Price</div>
                <div className="col-span-2 text-center">Amount</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Line Items */}
              <div className="p-2 space-y-1">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`lineItems.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Item description or product name" {...field} />
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
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                className="text-center"
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
                            <FormControl>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  className="pl-7 text-center"
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value));
                                    updateLineItemAmount(index);
                                  }}
                                />
                              </div>
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
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                                <Input 
                                  type="number" 
                                  readOnly 
                                  className="pl-7 text-center bg-slate-50"
                                  value={field.value.toFixed(2)} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
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
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>

            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setActiveSection('customer-info')}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back: Customer Info
              </Button>
              <Button 
                type="button" 
                onClick={() => setActiveSection('totals')}
                className="flex items-center"
              >
                Next: Totals & Submit
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Totals & Submit Section */}
          <div className={activeSection === 'totals' ? 'block' : 'hidden'}>
            {/* Totals Section */}
            <div className="bg-slate-50 p-4 rounded-md">
              <h3 className="text-md font-medium mb-4">Totals</h3>
              
              <div className="space-y-2">
                {/* Line Item Summary */}
                <div className="grid grid-cols-4 text-sm mb-2">
                  <div className="col-span-2 font-medium">Item</div>
                  <div className="text-right font-medium">Quantity</div>
                  <div className="text-right font-medium">Amount</div>
                </div>

                {fields.map((field, index) => {
                  const { description, quantity, amount } = form.getValues(`lineItems.${index}`);
                  return (
                    <div key={field.id} className="grid grid-cols-4 text-sm">
                      <div className="col-span-2 truncate">{description || 'Unnamed item'}</div>
                      <div className="text-right">{quantity}</div>
                      <div className="text-right">${amount.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t pt-4">
                <div className="w-full md:w-1/2 ml-auto space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span>${subTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sales Tax:</span>
                    <div className="w-48">
                      <Select
                        value={salesTaxId ? salesTaxId.toString() : "0"}
                        onValueChange={(value) => {
                          const taxId = parseInt(value);
                          if (taxId > 0 && salesTaxes) {
                            const selectedTax = salesTaxes.find(tax => tax.id === taxId);
                            if (selectedTax) {
                              setSalesTaxId(taxId);
                              setTaxRate(selectedTax.rate);
                              calculateTotals();
                            }
                          } else {
                            setSalesTaxId(null);
                            setTaxRate(0);
                            calculateTotals();
                          }
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
                                <SelectItem key={tax.id} value={tax.id.toString()}>
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
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navigation and Action Buttons */}
            <div className="flex justify-between mt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setActiveSection('items')}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Back: Line Items
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={recalculateLineItemAmounts}
                >
                  Recalculate
                </Button>
                <Button 
                  type="submit"
                  variant="default"
                  disabled={createInvoice.isPending}
                >
                  {createInvoice.isPending ? 'Saving...' : 'Save Invoice'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={sendInvoice}
                  disabled={!selectedContact?.email}
                >
                  <SendIcon className="h-4 w-4 mr-2" />
                  Send Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
