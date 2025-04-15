import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { X, Plus, CalendarIcon, CreditCard, ChevronUp, ChevronDown, Trash2, File, Printer, Send } from "lucide-react";
import { format } from "date-fns";
import { LineItem, Transaction, invoiceSchema, Invoice, InsertLineItem } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Payment terms options
type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

// Extended transaction type for invoices
interface InvoiceTransaction extends Transaction {
  dueDate?: string | Date;
}

// Invoice form props
interface InvoiceFormEditProps {
  invoice: InvoiceTransaction;
  lineItems: LineItem[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function InvoiceFormEdit({ invoice, lineItems, onSuccess, onCancel }: InvoiceFormEditProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTab, setSelectedTab] = useState("details");
  const [expandedSections, setExpandedSections] = useState({
    customer: true,
    invoice: true,
    summary: true,
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['/api/contacts'],
  });

  // Get sales taxes
  const { data: salesTaxes = [] } = useQuery({
    queryKey: ['/api/sales-taxes'],
  });

  // Get products
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
  });

  // Get accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
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

  // Calculate totals
  const calculateTotals = () => {
    const lineItems = form.getValues("lineItems");
    
    // Calculate subtotal
    const subTotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
    form.setValue("subTotal", subTotal);
    
    // Calculate tax amount
    let taxAmount = 0;
    lineItems.forEach((item: any) => {
      const salesTaxId = item.salesTaxId;
      if (salesTaxId) {
        const taxRate = Array.isArray(salesTaxes) 
          ? salesTaxes.find((tax: any) => tax.id === salesTaxId)?.rate || 0
          : 0;
        taxAmount += (item.amount || 0) * (taxRate / 100);
      }
    });
    form.setValue("taxAmount", taxAmount);
    
    // Calculate total amount
    form.setValue("totalAmount", subTotal + taxAmount);
  };

  // Watch for changes to line items and recalculate totals
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.includes('lineItems')) {
        calculateTotals();
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, salesTaxes]);

  // Add new line item
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
      ? products.find((p: any) => p.id === productId) 
      : null;
    if (!product) return;

    const currentValues = form.getValues(`lineItems.${index}`);
    form.setValue(`lineItems.${index}.description`, product.name);
    form.setValue(`lineItems.${index}.unitPrice`, product.price || 0);
    form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId || 0);
    
    // Recalculate amount
    const amount = (product.price || 0) * currentValues.quantity;
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

  // Set due date based on payment terms
  const updateDueDate = (terms: PaymentTerms) => {
    const currentDate = form.getValues("date");
    if (!currentDate) return;
    
    const dueDate = new Date(currentDate);
    if (terms === 'custom') {
      // Don't update, let user pick
      return;
    }
    
    // Add days to current date
    dueDate.setDate(dueDate.getDate() + parseInt(terms));
    form.setValue("dueDate", dueDate);
  };

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
    setIsSubmitting(true);
    
    // Format dates for API
    const submissionData = {
      ...data,
      // Pass the dates as they are - the API will handle conversion
    };

    invoiceMutation.mutate(submissionData as any);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white shadow-sm z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Edit Invoice</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isSubmitting ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
        <Tabs
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="container mx-auto px-4 sm:px-6 lg:px-8"
        >
          <TabsList className="grid grid-cols-2 w-60">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-grow overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className={selectedTab === "details" ? "block space-y-6 mt-0" : "hidden"}>
                {/* Customer Section */}
                <Card>
                  <div 
                    className="px-6 py-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleSection('customer')}
                  >
                    <h3 className="text-lg font-medium">Customer</h3>
                    {expandedSections.customer ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {expandedSections.customer && (
                    <CardContent className="pt-0">
                      <FormField
                        control={form.control}
                        name="contactId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Customer</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a customer" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">None</SelectItem>
                                {contacts.map((contact) => (
                                  <SelectItem key={contact.id} value={contact.id.toString()}>
                                    {contact.name} {contact.company ? `(${contact.company})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  )}
                </Card>

                {/* Invoice Details Section */}
                <Card>
                  <div 
                    className="px-6 py-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleSection('invoice')}
                  >
                    <h3 className="text-lg font-medium">Invoice Details</h3>
                    {expandedSections.invoice ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {expandedSections.invoice && (
                    <CardContent className="pt-0 space-y-4">
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

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="paid">Paid</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                      variant={"outline"}
                                      className={cn(
                                        "pl-3 text-left font-normal",
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
                                  updateDueDate(value as PaymentTerms);
                                }}
                                value={field.value?.toString()}
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
                            <FormItem className="flex flex-col">
                              <FormLabel>Due Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "pl-3 text-left font-normal",
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
                      </div>

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
                    </CardContent>
                  )}
                </Card>

                {/* Line Items Section */}
                <Card>
                  <CardContent className="p-0">
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
                                    {products.map((product) => (
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
                                        {salesTaxes.map((tax) => (
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
                    
                    <div className="px-6 py-4">
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
                  </CardContent>
                </Card>

                {/* Invoice Summary Section */}
                <Card>
                  <div 
                    className="px-6 py-4 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleSection('summary')}
                  >
                    <h3 className="text-lg font-medium">Summary</h3>
                    {expandedSections.summary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {expandedSections.summary && (
                    <CardContent className="pt-0">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between pt-4">
                          <span className="font-medium">Subtotal</span>
                          <span>
                            ${form.watch("subTotal")?.toFixed(2) || "0.00"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="font-medium">Tax</span>
                          <span>
                            ${form.watch("taxAmount")?.toFixed(2) || "0.00"}
                          </span>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex justify-between pt-2">
                          <span className="text-lg font-semibold">Total</span>
                          <span className="text-lg font-semibold">
                            ${form.watch("totalAmount")?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </div>

              <div className={selectedTab === "accounting" ? "block space-y-6 mt-0" : "hidden"}>
                {/* Accounting references would go here */}
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-500">
                      This invoice will be recorded in the ledger according to the
                      accounting settings. The entries are automatically generated based
                      on the invoice details.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </form>
          </Form>
        </div>
      </div>

      {/* Fixed bottom panel */}
      <div className="bg-white p-4 border-t border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <File className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={form.handleSubmit(onSubmit)}
            >
              {isSubmitting ? "Saving..." : "Save Invoice"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}