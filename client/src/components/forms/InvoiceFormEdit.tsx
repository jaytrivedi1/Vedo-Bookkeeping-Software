import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice, invoiceSchema, Contact, SalesTax, Product, Transaction, LineItem } from "@shared/schema";

// Extend the Transaction type to include appliedAmount for credits
interface TransactionWithCredit extends Transaction {
  appliedAmount?: number;
}

// Extend the Invoice type to include credit application properties
interface ExtendedInvoice extends Invoice {
  appliedCreditAmount?: number;
  appliedCredits?: {id: number, amount: number}[];
}
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

interface InvoiceTransaction extends Transaction {
  dueDate?: string | Date;
}

interface InvoiceFormEditProps {
  invoice: InvoiceTransaction;
  lineItems: LineItem[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

interface TaxComponentInfo {
  id: number;
  name: string;
  rate: number;
  amount: number;
  isComponent: boolean;
  parentId?: number;
}

interface InvoiceFormType extends UseFormReturn<Invoice> {
  taxComponentsInfo?: TaxComponentInfo[];
}

export default function InvoiceFormEdit({ invoice, lineItems, onSuccess, onCancel }: InvoiceFormEditProps) {
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  // Initialize state with values from the invoice
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [dueDate, setDueDate] = useState<Date>(
    invoice.dueDate ? new Date(invoice.dueDate) : addDays(new Date(invoice.date), 30)
  );
  const [subTotal, setSubTotal] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [balanceDue, setBalanceDue] = useState(0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [watchContactId, setWatchContactId] = useState<number | undefined>(invoice.contactId ?? undefined);
  const [unappliedCredits, setUnappliedCredits] = useState<TransactionWithCredit[]>([]);
  const [totalUnappliedCredits, setTotalUnappliedCredits] = useState(0);
  const [appliedCreditAmount, setAppliedCreditAmount] = useState(0);
  const { toast } = useToast();

  // Use the existing invoice number
  const invoiceDate = new Date(invoice.date);
  const invoiceNumber = invoice.reference;

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });
  
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Fetch customer's unapplied credits when a contact is selected
  const { data: transactions } = useQuery<TransactionWithCredit[]>({
    queryKey: ['/api/transactions'],
    enabled: !!watchContactId,
  });
  
  // Filter for unapplied credits for the selected customer
  useEffect(() => {
    if (watchContactId && transactions) {
      const customerCredits = transactions.filter(transaction => 
        transaction.type === 'deposit' && 
        transaction.status === 'unapplied_credit' && 
        transaction.contactId === Number(watchContactId) &&
        transaction.balance !== null && 
        transaction.balance < 0 // Balance should be negative for credits
      );
      
      setUnappliedCredits(customerCredits);
      
      // Calculate total unapplied credits amount (absolute value of balance)
      const totalCredits = customerCredits.reduce((sum, credit) => {
        const availableCredit = credit.balance !== null ? Math.abs(credit.balance) : 0;
        return sum + availableCredit;
      }, 0);
      
      setTotalUnappliedCredits(totalCredits);
    } else {
      setUnappliedCredits([]);
      setTotalUnappliedCredits(0);
    }
  }, [watchContactId, transactions]);
  
  // Ensure products are properly typed
  const typedProducts = products?.map(product => ({
    ...product,
    price: typeof product.price === 'number' ? product.price : 0
  })) || [];

  // Log initial data to help with debugging
  console.log("Initial invoice data:", invoice);
  console.log("Initial line items:", lineItems);
  console.log("Available products:", typedProducts);
  
  // Map each line item description to the appropriate product ID if a match is found
  const [descriptionToProductIdMap, setDescriptionToProductIdMap] = useState<Record<string, string>>({});
  
  // Initialize the product mapping when products are loaded
  useEffect(() => {
    if (!typedProducts || typedProducts.length === 0 || !lineItems || lineItems.length === 0) return;
    
    // Create a map of descriptions to product IDs
    const newMap: Record<string, string> = {};
    
    lineItems.forEach((item, index) => {
      const matchingProduct = typedProducts.find(p => p.name.trim() === item.description.trim());
      
      if (matchingProduct) {
        console.log(`Found product match for line ${index + 1}: "${item.description}" → ID: ${matchingProduct.id}`);
        newMap[`lineItems.${index}.description`] = matchingProduct.id.toString();
      } else {
        console.log(`No product match for line ${index + 1}: "${item.description}"`);
        newMap[`lineItems.${index}.description`] = "custom";
      }
    });
    
    setDescriptionToProductIdMap(newMap);
  }, [typedProducts, lineItems]);
  
  // Initialize form with the existing invoice data
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      date: invoiceDate,
      contactId: invoice.contactId ?? 0,
      reference: invoiceNumber,
      description: invoice.description || '',
      status: invoice.status as "open" | "paid" | "overdue" | "partial",
      lineItems: lineItems.length > 0 
        ? lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            // Type handling for salesTaxId
            salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined
          }))
        : [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined }],
    },
  }) as InvoiceFormType;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Initialize the contact when component mounts
  useEffect(() => {
    if (contacts && invoice.contactId) {
      const contact = contacts.find(c => c.id === invoice.contactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [contacts, invoice.contactId]);

  // Initialize totals when component mounts
  useEffect(() => {
    calculateTotals();
  }, [salesTaxes]);

  const updateInvoice = useMutation({
    mutationFn: async (data: ExtendedInvoice) => {
      console.log("Updating invoice with data:", JSON.stringify(data, null, 2));
      return await apiRequest(`/api/invoices/${invoice.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Invoice saved",
        description: "Invoice has been saved successfully",
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
      // Log the complete error object to debug
      console.error("Error saving invoice:", error);
      
      // Extract error message and details from the response
      let errorMessage = "";
      let referenceError = false;
      
      try {
        // Try to parse the error response if it's a string
        if (typeof error.message === 'string' && error.message.includes('Invoice reference must be unique')) {
          errorMessage = "An invoice with this reference number already exists. Please use a different reference number.";
          referenceError = true;
        } 
        // Check if the error has structured data from our API
        else if (error.errors && Array.isArray(error.errors)) {
          // Find reference-specific errors
          const refError = error.errors.find((err: any) => 
            Array.isArray(err.path) && err.path.includes('reference')
          );
          
          if (refError) {
            errorMessage = refError.message || "Invoice reference number must be unique";
            referenceError = true;
          }
        }
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
      
      if (referenceError) {
        // Show a specific UI error message for duplicate reference
        toast({
          title: "Duplicate Invoice Number",
          description: errorMessage,
          variant: "destructive",
        });
        
        // Set form field error
        form.setError("reference", {
          type: "manual",
          message: "This invoice number is already in use"
        });
        
        // Scroll to the reference field
        setTimeout(() => {
          const referenceField = document.querySelector("[name='reference']");
          if (referenceField) {
            referenceField.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      } else {
        // Show a generic error message for other errors
        toast({
          title: "Error saving invoice",
          description: error?.message || "There was a problem saving the invoice. Please try again.",
          variant: "destructive",
        });
      }
    }
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
    
    // Calculate tax amount based on the per-line item tax rates
    let totalTaxAmount = 0;
    const usedTaxes = new Map<number, SalesTax>();
    
    // Track tax components separately for display
    const taxComponents = new Map<number, {
      id: number,
      name: string,
      rate: number,
      amount: number,
      isComponent: boolean,
      parentId?: number
    }>();
    
    // Loop through each line item and calculate its tax
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        // Find the tax rate for this line item
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          // Check if it's a composite tax with components
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            if (components.length > 0) {
              // For QST+GST specifically, we need special handling to show both taxes
              if (salesTax.name === 'QST+GST') {
                // QST is 9.975% and GST is 5%
                const gstComponent = components.find(c => c.name === 'GST');
                const qstComponent = components.find(c => c.name === 'QST');
                
                if (gstComponent && qstComponent) {
                  // Calculate GST (5%) on original amount
                  const gstAmount = (item.amount || 0) * (gstComponent.rate / 100);
                  
                  // Calculate QST (9.975%) on the original amount (not compounded for invoice display)
                  const qstAmount = (item.amount || 0) * (qstComponent.rate / 100);
                  
                  // Add both tax amounts to the total
                  totalTaxAmount += (gstAmount + qstAmount);
                  
                  // Update/create GST component entry
                  const existingGstComponent = taxComponents.get(gstComponent.id);
                  if (existingGstComponent) {
                    existingGstComponent.amount += gstAmount;
                    taxComponents.set(gstComponent.id, existingGstComponent);
                  } else {
                    // Add GST component to the map
                    taxComponents.set(gstComponent.id, {
                      id: gstComponent.id,
                      name: gstComponent.name,
                      rate: gstComponent.rate,
                      amount: gstAmount,
                      isComponent: true,
                      parentId: salesTax.id
                    });
                  }
                  
                  // Update/create QST component entry
                  const existingQstComponent = taxComponents.get(qstComponent.id);
                  if (existingQstComponent) {
                    existingQstComponent.amount += qstAmount;
                    taxComponents.set(qstComponent.id, existingQstComponent);
                  } else {
                    // Add QST component to the map
                    taxComponents.set(qstComponent.id, {
                      id: qstComponent.id,
                      name: qstComponent.name,
                      rate: qstComponent.rate,
                      amount: qstAmount,
                      isComponent: true,
                      parentId: salesTax.id
                    });
                  }
                } else {
                  // Fallback to regular component calculation if components aren't found
                  components.forEach(component => {
                    const componentTaxAmount = (item.amount || 0) * (component.rate / 100);
                    totalTaxAmount += componentTaxAmount;
                    
                    // Add/update component in the tax components map
                    const existingComponent = taxComponents.get(component.id);
                    if (existingComponent) {
                      existingComponent.amount += componentTaxAmount;
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
                }
              } else {
                // For other composite taxes, calculate each component separately
                components.forEach(component => {
                  const componentTaxAmount = (item.amount || 0) * (component.rate / 100);
                  totalTaxAmount += componentTaxAmount;
                  
                  // Add/update component in the tax components map
                  const existingComponent = taxComponents.get(component.id);
                  if (existingComponent) {
                    existingComponent.amount += componentTaxAmount;
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
              }
              
              // Also track the parent/composite tax
              usedTaxes.set(salesTax.id, salesTax);
            } else {
              // If no components found, use the composite tax itself
              const itemTaxAmount = (item.amount || 0) * (salesTax.rate / 100);
              totalTaxAmount += itemTaxAmount;
              usedTaxes.set(salesTax.id, salesTax);
              
              // Add to components map for display
              const existingTax = taxComponents.get(salesTax.id);
              if (existingTax) {
                existingTax.amount += itemTaxAmount;
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
            // Regular non-composite tax
            const itemTaxAmount = (item.amount || 0) * (salesTax.rate / 100);
            totalTaxAmount += itemTaxAmount;
            
            // Track which taxes are being used
            usedTaxes.set(salesTax.id, salesTax);
            
            // Add to components map for display
            const existingTax = taxComponents.get(salesTax.id);
            if (existingTax) {
              existingTax.amount += itemTaxAmount;
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
    
    const total = subtotal + totalTaxAmount;
    
    // Get all unique tax names used in this invoice
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    
    // Convert tax components map to array
    const taxComponentsArray = Array.from(taxComponents.values());
    
    // Store in a property accessible during form rendering
    form.taxComponentsInfo = taxComponentsArray;
    
    console.log("Calculating totals:", { 
      subtotal, 
      totalTaxAmount, 
      total,
      appliedCreditAmount,
      lineItems,
      taxNames: taxNameList,
      taxComponents: taxComponentsArray
    });
    
    // Make sure to persist these values
    setSubTotal(subtotal);
    setTaxAmount(totalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
    
    // Calculate balance due (total - applied credits)
    // First, get the accurate total of all applied credits directly from the credit array
    const accurateAppliedTotal = unappliedCredits.reduce((sum, c) => 
      sum + (c.appliedAmount || 0), 0
    );
    
    console.log("Accurate applied total from credits array:", accurateAppliedTotal);
    
    // Update the appliedCreditAmount state with the accurate value
    if (Math.abs(accurateAppliedTotal - appliedCreditAmount) > 0.01) {
      console.log("Correcting applied credit amount:", { 
        old: appliedCreditAmount, 
        new: accurateAppliedTotal 
      });
      setAppliedCreditAmount(accurateAppliedTotal);
    }
    
    // Now calculate the balance with the accurate credit amount
    const newBalanceDue = total - accurateAppliedTotal;
    
    console.log("Balance calculation:", {
      total,
      appliedCreditAmount,
      accurateAppliedTotal,
      newBalanceDue
    });
    
    setBalanceDue(newBalanceDue > 0 ? newBalanceDue : 0);
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
  
  // Handle credit application 
  const handleApplyCreditAmount = (amount: number) => {
    // Make sure we don't apply more than the available credits
    const validAmount = Math.min(amount, totalUnappliedCredits);
    // Don't allow negative values
    const safeAmount = Math.max(0, validAmount);
    
    console.log("Setting applied credit amount:", safeAmount);
    setAppliedCreditAmount(safeAmount);
    calculateTotals();
  };

  // Update totals whenever line items change
  useEffect(() => {
    calculateTotals();
  }, [fields]);

  // Update due date when invoice date changes and watch for contactId changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'date' && value.date) {
        const days = paymentTerms === 'custom' ? 30 : parseInt(paymentTerms);
        setDueDate(addDays(value.date as Date, days));
      }
      
      if (name === 'contactId' && value.contactId) {
        const contactId = Number(value.contactId);
        handleContactChange(contactId);
        setWatchContactId(contactId);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, paymentTerms]);

  const onSubmit = (data: Invoice) => {
    console.log("Form data before submit:", data);
    
    // Filter out empty line items
    const filteredLineItems = data.lineItems.filter(item => 
      item.description && item.description.trim() !== "" && 
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
    const enrichedData: ExtendedInvoice = {
      ...data,
      // Make sure we're passing Date objects and not strings
      date: data.date instanceof Date ? data.date : new Date(data.date),
      dueDate: dueDate instanceof Date ? dueDate : new Date(dueDate),
      // Ensure required fields are present
      reference: data.reference || invoiceNumber,
      status: 'open' as const, // Default status for open invoices
      description: data.description || '',
      subTotal,
      taxAmount,
      totalAmount,
      paymentTerms
    };
    
    // Calculate the line item amounts and ensure salesTaxId is properly handled
    enrichedData.lineItems = filteredLineItems.map(item => {
      // Calculate the correct amount for this line item
      const amount = calculateLineItemAmount(item.quantity, item.unitPrice);
      
      // Transform into a properly formatted line item with correct salesTaxId handling
      const formattedItem: any = {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: amount
      };
      
      // Add salesTaxId only if it exists and is not zero/undefined
      if (item.salesTaxId) {
        formattedItem.salesTaxId = item.salesTaxId;
      }
      
      return formattedItem;
    });
    
    // Include applied credit information if there are credits applied
    if (appliedCreditAmount > 0) {
      enrichedData.appliedCreditAmount = appliedCreditAmount;
      
      // Collect all credits that have amounts applied to them
      const appliedCredits: {id: number, amount: number}[] = [];
      
      unappliedCredits.forEach(credit => {
        if (credit.appliedAmount && credit.appliedAmount > 0) {
          appliedCredits.push({
            id: credit.id,
            amount: credit.appliedAmount
          });
        }
      });
      
      enrichedData.appliedCredits = appliedCredits;
      
      console.log("Including credit applications:", {
        appliedCreditAmount,
        appliedCredits
      });
    }
    
    console.log("Sending to server:", enrichedData);
    if (updateInvoice.isPending) return; // Prevent double submission
    updateInvoice.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium">Invoice no.{invoiceNumber}</h1>
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
                        <FormControl>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(parseInt(value));
                              handleContactChange(parseInt(value));
                            }} 
                            defaultValue={field.value?.toString()}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
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
                        </FormControl>
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
                  <FormItem>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                  
                  {/* Recurring invoice option removed as requested */}
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
              
              {/* Tags section removed as requested */}
              
              {/* Line Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">Amounts are</div>
                  <FormItem>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                </div>
                
                <div className="border rounded-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 grid grid-cols-12 text-xs font-medium p-2 border-b">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4">PRODUCT/SERVICE</div>
                    <div className="col-span-2">DESCRIPTION</div>
                    <div className="col-span-1 text-center">QTY</div>
                    <div className="col-span-1 text-center">RATE (CAD)</div>
                    <div className="col-span-1 text-center">AMOUNT (CAD)</div>
                    <div className="col-span-2 text-center">SALES TAX</div>
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
                                <Select
                                  onValueChange={(value) => {
                                    if (value === 'custom') {
                                      // Handle custom product
                                      field.onChange('');
                                    } else {
                                      const productId = parseInt(value);
                                      const product = typedProducts.find(p => p.id === productId);
                                      if (product) {
                                        // Set the product name as the description
                                        field.onChange(product.name);
                                        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(product.price.toString()));
                                        
                                        // When a product with tax is selected, set the line item tax
                                        if (product.salesTaxId) {
                                          form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId);
                                        }
                                        
                                        // Update the amount calculations
                                        updateLineItemAmount(index);
                                      }
                                    }
                                  }}
                                  value={(() => {
                                    // Use our pre-calculated mapping if available
                                    const mappedValue = descriptionToProductIdMap[`lineItems.${index}.description`];
                                    if (mappedValue) {
                                      console.log(`Using mapped product ID for line ${index + 1}:`, mappedValue);
                                      return mappedValue;
                                    }
                                    
                                    // Fall back to the previous logic if no mapping exists
                                    // Try to find a matching product based on description - check for exact matches first
                                    let matchingProduct = typedProducts.find(
                                      p => p.name === field.value
                                    );
                                    
                                    // If no exact match, look for products that contain the description or vice versa
                                    if (!matchingProduct && field.value) {
                                      matchingProduct = typedProducts.find(p => 
                                        field.value.includes(p.name) || p.name.includes(field.value)
                                      );
                                    }
                                    
                                    // If we found a match, return its ID
                                    if (matchingProduct) {
                                      console.log("Found matching product:", matchingProduct.name);
                                      return matchingProduct.id.toString();
                                    }
                                    
                                    // If still no match, use custom
                                    console.log("No matching product found for:", field.value);
                                    return field.value ? "custom" : "";
                                  })()}
                                >
                                  <SelectTrigger className="bg-transparent border-0 border-b p-1 focus:ring-0 rounded-none h-10">
                                    <SelectValue placeholder="Select a product/service" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productsLoading ? (
                                      <SelectItem value="loading" disabled>Loading products...</SelectItem>
                                    ) : typedProducts && typedProducts.length > 0 ? (
                                      <>
                                        <SelectItem value="custom">Enter custom item</SelectItem>
                                        {typedProducts.map((product) => (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            {product.name} (${product.price.toFixed(2)})
                                          </SelectItem>
                                        ))}
                                      </>
                                    ) : (
                                      <>
                                        <SelectItem value="custom">Enter custom item</SelectItem>
                                        <SelectItem value="none" disabled>No products available</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                                {/* Input field for custom items - check if we're in "custom" mode */}
                                {(() => {
                                  // Check if we need to show the input field for custom entries
                                  const selectValue = (() => {
                                    // If there's a matching product, we found the ID earlier
                                    const matchingProduct = typedProducts.find(p => p.name === field.value);
                                    if (matchingProduct) return matchingProduct.id.toString();
                                    
                                    // Otherwise, if there's a value, it's custom
                                    return field.value ? "custom" : "";
                                  })();
                                  
                                  if (selectValue === "custom") {
                                    return (
                                      <Input 
                                        className="bg-transparent border-0 p-1 focus:ring-0 mt-1" 
                                        placeholder="Enter item name" 
                                        value={field.value} 
                                        onChange={(e) => field.onChange(e.target.value)}
                                      />
                                    );
                                  }
                                  return null;
                                })()}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
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
                      
                      {/* Sales Tax dropdown for each line item */}
                      <div className="col-span-2">
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
                                      field.onChange(undefined);
                                    } else {
                                      field.onChange(numValue);
                                    }
                                    updateLineItemAmount(index);
                                    calculateTotals();
                                  }}
                                >
                                  <SelectTrigger className="bg-transparent border-0 border-b p-1 focus:ring-0 rounded-none h-10">
                                    <SelectValue placeholder="Select Tax" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="0">None</SelectItem>
                                    {salesTaxes?.filter(tax => !tax.parentId).map((tax) => (
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
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Subtotal</span>
                      <span>${subTotal.toFixed(2)}</span>
                    </div>
                    
                    {/* Tax Summary */}
                    {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 ? (
                      <>
                        {/* Individual tax components */}
                        {form.taxComponentsInfo.map((taxComponent) => (
                          <div key={taxComponent.id} className="flex justify-between items-center">
                            <span className="text-sm">
                              {taxComponent.name} ({taxComponent.rate}%)
                            </span>
                            <span>${taxComponent.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          {taxNames.length > 0 
                            ? taxNames.join(', ')  
                            : 'Tax'}
                        </span>
                        <span>${taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm">Total</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                    
                    {/* Unapplied Credits section - only show if customer has credits */}
                    {unappliedCredits.length > 0 && (
                      <div className="mt-3 border rounded-md p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Available Credits</span>
                          <span className="text-green-600 font-medium">${totalUnappliedCredits.toFixed(2)}</span>
                        </div>
                        
                        <div className="text-sm mb-2">Apply credits to this invoice:</div>
                        
                        <div className="space-y-2">
                          {unappliedCredits.map((credit) => {
                            const availableAmount = Math.abs(credit.balance || 0);
                            return (
                              <div key={credit.id} className="flex items-center gap-3 border-b pb-2">
                                <div className="flex-grow">
                                  <div className="flex justify-between">
                                    <span className="font-medium">Credit #{credit.id}</span>
                                    <span className="text-green-600">${availableAmount.toFixed(2)}</span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(new Date(credit.date), 'MMM dd, yyyy')}
                                    {credit.description && ` - ${credit.description.substring(0, 40)}${credit.description.length > 40 ? '...' : ''}`}
                                  </div>
                                </div>
                                <div className="w-24">
                                  <Input
                                    type="number"
                                    min="0"
                                    max={availableAmount}
                                    step="0.01"
                                    placeholder="0.00"
                                    className="bg-white border-gray-300 h-8"
                                    value={credit.appliedAmount || ''}
                                    onChange={(e) => {
                                      console.log("Credit input raw value:", e.target.value);
                                      // This will need to be modified to track individual credit applications
                                      const amount = parseFloat(e.target.value);
                                      if (!isNaN(amount)) {
                                        // For now we'll just use the sum for the total applied credit
                                        // but we need to track which credits were applied
                                        const validAmount = Math.min(amount, availableAmount);
                                        const safeAmount = Math.max(0, validAmount);
                                        
                                        // Store the individual credit application amount
                                        credit.appliedAmount = safeAmount;
                                        
                                        // Just call calculateTotals which will compute the accurate sum from all credits
                                        console.log("Credit input changed. Credit ID:", credit.id, "Amount:", safeAmount);
                                        calculateTotals();
                                      } else {
                                        // If the input is cleared or invalid, set applied amount to 0
                                        credit.appliedAmount = 0;
                                        
                                        // Just call calculateTotals which will compute the accurate sum from all credits
                                        console.log("Credit input cleared. Credit ID:", credit.id);
                                        calculateTotals();
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {appliedCreditAmount > 0 && (
                          <div className="flex justify-between items-center mt-3 text-green-600 font-medium">
                            <span>Total Applied:</span>
                            <span>${appliedCreditAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between font-medium border-t pt-2 mt-3">
                      <span>Balance due</span>
                      <span>${balanceDue.toFixed(2)}</span>
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
                <div className="text-2xl font-medium">${balanceDue.toFixed(2)}</div>
                {appliedCreditAmount > 0 && (
                  <div className="text-sm text-green-600 mt-1">
                    Credits applied: ${appliedCreditAmount.toFixed(2)}
                  </div>
                )}
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
                            value={invoiceNumber} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* File upload section */}
                <div className="mt-4">
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
                    <p className="text-xs text-gray-500">Drag and drop files here</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, image files</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed footer - now a flex item in our flex column layout */}
        <div className="border-t bg-gray-100 py-4 px-4 md:px-6 flex flex-col md:flex-row gap-3 justify-between z-50 shadow-md sticky bottom-0 mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} className="md:w-auto w-full">
            Cancel
          </Button>
          
          <div className="flex flex-wrap md:flex-nowrap gap-2 md:space-x-2">
            <div className="flex md:hidden w-full justify-end">
              {/* Mobile save button */}
              <Button 
                type="submit"
                disabled={updateInvoice.isPending}
                className="w-full md:w-auto"
              >
                {updateInvoice.isPending ? 'Saving...' : 'Save and send'}
              </Button>
            </div>
            
            <div className="hidden md:flex md:space-x-2 flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex">
                Print or Preview
              </Button>
              <Button type="button" variant="outline" size="sm" className="hidden lg:inline-flex">
                Customize
              </Button>
              
              <div className="flex">
                <Button 
                  type="submit"
                  disabled={updateInvoice.isPending}
                >
                  {updateInvoice.isPending ? 'Saving...' : 'Save'}
                </Button>
                <div className="relative ml-px">
                  <FormItem>
                    <FormControl>
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
                    </FormControl>
                  </FormItem>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
