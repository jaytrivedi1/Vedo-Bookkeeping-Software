import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice as BaseInvoice, invoiceSchema, Contact, SalesTax, Product, Transaction as BaseTransaction } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";

// Extend the Transaction type to include appliedAmount for credits
interface Transaction extends BaseTransaction {
  appliedAmount?: number;
}

// Custom line item type for form with string productId for Select component compatibility
interface FormLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  salesTaxId?: number;
  productId?: string; // String for Select component value matching
}

// Extend the Invoice type to include credit application properties and custom line items
interface Invoice extends Omit<BaseInvoice, 'lineItems'> {
  lineItems: FormLineItem[];
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

interface InvoiceFormProps {
  invoice?: any; // Transaction object from database
  lineItems?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentTerms = '7' | '14' | '30' | '60' | 'custom';

// Define the tax component info type
interface TaxComponentInfo {
  id: number;
  name: string;
  rate: number;
  amount: number;
  isComponent: boolean;
  parentId?: number;
}

// Extend UseFormReturn to include our custom property
interface InvoiceFormType extends UseFormReturn<Invoice> {
  taxComponentsInfo?: TaxComponentInfo[];
}

export default function InvoiceForm({ invoice, lineItems, onSuccess, onCancel }: InvoiceFormProps) {
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  
  // Initialize based on mode (create vs edit)
  const isEditing = Boolean(invoice);
  const initialDate = isEditing ? new Date(invoice!.date) : new Date();
  const initialDueDate = isEditing && invoice!.dueDate ? new Date(invoice!.dueDate) : addDays(initialDate, 30);
  
  const [dueDate, setDueDate] = useState<Date>(initialDueDate);
  const [subTotal, setSubTotal] = useState(isEditing ? (invoice?.amount || 0) : 0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [manualTaxAmount, setManualTaxAmount] = useState<number | null>(null); // null means use calculated tax
  const [totalAmount, setTotalAmount] = useState(isEditing ? (invoice?.amount || 0) : 0);
  const [balanceDue, setBalanceDue] = useState(isEditing ? (invoice?.balance || invoice?.amount || 0) : 0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [watchContactId, setWatchContactId] = useState<number | undefined>(invoice?.contactId);
  const [unappliedCredits, setUnappliedCredits] = useState<Transaction[]>([]);
  const [totalUnappliedCredits, setTotalUnappliedCredits] = useState(0);
  const [appliedCreditAmount, setAppliedCreditAmount] = useState(0);
  const { toast } = useToast();

  // Extract next invoice number or use existing
  const today = new Date();
  const defaultInvoiceNumber = isEditing ? invoice?.reference : `1001`;

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
  const { data: transactions } = useQuery<Transaction[]>({
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

  // Use our custom form type that includes taxComponentsInfo
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: isEditing ? {
      date: initialDate,
      contactId: invoice?.contactId,
      reference: invoice?.reference,
      description: invoice?.description || '',
      status: invoice?.status as "open" | "paid" | "overdue" | "partial",
      lineItems: lineItems?.length ? lineItems.map(item => {
        // Map line item for editing, converting productId to string for Select component
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
          // Convert productId to string for Select component value matching
          productId: item.productId !== null && item.productId !== undefined ? String(item.productId) : undefined
        };
      }) : [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined }],
    } : {
      date: today,
      contactId: undefined,
      reference: defaultInvoiceNumber,
      description: '',
      status: 'open' as const,
      lineItems: [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined }],
    },
  }) as InvoiceFormType;
  
  // Watch for contact changes to fetch unapplied credits
  const watchedContactId = form.watch("contactId");
  useEffect(() => {
    if (watchedContactId) {
      setWatchContactId(watchedContactId);
    }
  }, [watchedContactId]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Initialize totals from existing invoice data when in edit mode
  useEffect(() => {
    if (isEditing && lineItems?.length && invoice) {
      // Don't recalculate - use existing data
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxTotal = (invoice.amount || 0) - subtotal;
      
      setSubTotal(subtotal);
      setTaxAmount(taxTotal);
      setTotalAmount(invoice.amount || 0);
      // Keep the existing balance - don't recalculate it
      setBalanceDue(invoice.balance || invoice.amount || 0);
      
      // Calculate applied credits from balance difference
      const appliedAmount = (invoice.amount || 0) - (invoice.balance || invoice.amount || 0);
      setAppliedCreditAmount(appliedAmount);
    }
  }, [isEditing, lineItems, invoice]);

  // Set selected contact when editing an invoice
  useEffect(() => {
    if (isEditing && invoice?.contactId && contacts && !selectedContact) {
      const contact = contacts.find(c => c.id === invoice.contactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [isEditing, invoice?.contactId, contacts, selectedContact]);

  const saveInvoice = useMutation({
    mutationFn: async (data: BaseInvoice) => {
      if (isEditing) {
        console.log("Updating invoice with data:", JSON.stringify(data, null, 2));
        return await apiRequest(`/api/invoices/${invoice?.id}`, 'PATCH', data);
      } else {
        console.log("Creating invoice with data:", JSON.stringify(data, null, 2));
        return await apiRequest('/api/invoices', 'POST', data);
      }
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
    return roundTo2Decimals(quantity * unitPrice);
  };

  const recalculateLineItemAmounts = () => {
    const lineItems = form.getValues('lineItems');
    
    lineItems.forEach((item, index) => {
      const amount = calculateLineItemAmount(item.quantity, item.unitPrice);
      form.setValue(`lineItems.${index}.amount`, amount);
    });
    
    calculateTotals();
  };

  const calculateTotals = (creditsArray?: Transaction[]) => {
    const lineItems = form.getValues('lineItems');
    const subtotal = roundTo2Decimals(lineItems.reduce((sum, item) => sum + (item.amount || 0), 0));
    
    // Calculate tax amount based on the per-line item tax rates
    let totalTaxAmount = 0;
    const usedTaxes = new Map<number, SalesTax>();
    
    // Note: We'll calculate applied credit amount later in this function
    // to avoid duplication
    
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
                  const gstAmount = roundTo2Decimals((item.amount || 0) * (gstComponent.rate / 100));
                  
                  // Calculate QST (9.975%) on the original amount (not compounded for invoice display)
                  const qstAmount = roundTo2Decimals((item.amount || 0) * (qstComponent.rate / 100));
                  
                  // Add both tax amounts to the total
                  totalTaxAmount = roundTo2Decimals(totalTaxAmount + gstAmount + qstAmount);
                  
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
                  // Fallback if the components aren't found
                  components.forEach(component => {
                    const componentTaxAmount = roundTo2Decimals((item.amount || 0) * (component.rate / 100));
                    totalTaxAmount = roundTo2Decimals(totalTaxAmount + componentTaxAmount);
                    taxComponents.set(component.id, {
                      id: component.id,
                      name: component.name,
                      rate: component.rate,
                      amount: componentTaxAmount,
                      isComponent: true,
                      parentId: salesTax.id
                    });
                  });
                }
              } else {
                // For other composite taxes, calculate each component separately
                components.forEach(component => {
                  const componentTaxAmount = roundTo2Decimals((item.amount || 0) * (component.rate / 100));
                  totalTaxAmount = roundTo2Decimals(totalTaxAmount + componentTaxAmount);
                  
                  // Add/update component in the tax components map
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
              }
              
              // Also track the parent/composite tax
              usedTaxes.set(salesTax.id, salesTax);
            } else {
              // If no components found, use the composite tax itself
              const itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
              totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
              usedTaxes.set(salesTax.id, salesTax);
              
              // Add to components map for display
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
            // Regular non-composite tax
            const itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
            totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
            
            // Track which taxes are being used
            usedTaxes.set(salesTax.id, salesTax);
            
            // Add to components map for display
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
    
    // Use manual tax amount if set, otherwise use calculated tax
    const finalTaxAmount = manualTaxAmount !== null ? manualTaxAmount : totalTaxAmount;
    const total = roundTo2Decimals(subtotal + finalTaxAmount);
    
    // Get all unique tax names used in this invoice
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    
    // Convert tax components map to array and sort by displayOrder if available
    const taxComponentsArray = Array.from(taxComponents.values());
    
    // Store in a property accessible during form rendering
    form.taxComponentsInfo = taxComponentsArray;
    
    console.log("Calculating totals:", { 
      subtotal, 
      totalTaxAmount, 
      manualTaxAmount,
      finalTaxAmount,
      total,
      appliedCreditAmount,
      lineItems,
      taxNames: taxNameList,
      taxComponents: taxComponentsArray
    });
    
    // Make sure to persist these values
    setSubTotal(subtotal);
    setTaxAmount(finalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
    
    // Calculate balance due (total - applied credits)
    // Use the provided credits array if available, otherwise use state
    const creditsToUse = creditsArray || unappliedCredits;
    
    // Get the accurate total of all applied credits directly from the credit array
    const accurateAppliedTotal = creditsToUse.reduce((sum, c) => 
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
    
    // Calculate balance carefully - preserve existing balance in edit mode
    let newBalanceDue: number;
    
    if (isEditing && invoice?.balance !== undefined) {
      // In edit mode, preserve the existing balance from the database
      // Don't recalculate it from scratch
      newBalanceDue = invoice.balance;
    } else {
      // In create mode, calculate balance normally
      newBalanceDue = roundTo2Decimals(total - accurateAppliedTotal);
    }
    
    console.log("Balance calculation:", {
      total,
      appliedCreditAmount,
      accurateAppliedTotal,
      newBalanceDue,
      isEditMode: isEditing,
      existingBalance: invoice?.balance
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
    const enrichedData = {
      ...data,
      // Make sure we're passing Date objects and not strings
      date: data.date instanceof Date ? data.date : new Date(data.date),
      dueDate: dueDate instanceof Date ? dueDate : new Date(dueDate),
      // Ensure required fields are present
      reference: data.reference || defaultInvoiceNumber,
      status: 'open' as const, // Default status for new invoices
      description: data.description || '',
      subTotal,
      taxAmount,
      totalAmount,
      paymentTerms
    };
    
    // Calculate the line item amounts and ensure salesTaxId and productId are properly handled
    // Convert line items to backend format with numeric productId
    const backendLineItems = filteredLineItems.map(item => {
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
      
      // Convert productId from string to number if it exists (explicit null/undefined check)
      if (item.productId !== null && item.productId !== undefined) {
        formattedItem.productId = parseInt(item.productId);
      }
      
      return formattedItem;
    });
    
    // Create properly typed payload for backend with numeric productIds
    const backendPayload: BaseInvoice & { appliedCreditAmount?: number; appliedCredits?: {id: number, amount: number}[] } = {
      ...enrichedData,
      lineItems: backendLineItems
    };
    
    // Include applied credit information if there are credits applied
    if (appliedCreditAmount > 0) {
      backendPayload.appliedCreditAmount = appliedCreditAmount;
      
      // Collect all credits that have amounts applied to them
      const appliedCredits: {id: number, amount: number}[] = [];
      
      // Only include credits that have an amount applied
      for (const credit of unappliedCredits) {
        if (credit.appliedAmount && credit.appliedAmount > 0) {
          appliedCredits.push({
            id: credit.id,
            amount: credit.appliedAmount
          });
        }
      }
      
      backendPayload.appliedCredits = appliedCredits;
    }
    
    console.log("Sending to server:", backendPayload);
    if (saveInvoice.isPending) return; // Prevent double submission
    saveInvoice.mutate(backendPayload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Invoice #{form.watch('reference')}</h1>
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

        <div className="p-6 overflow-y-auto flex-grow bg-gray-50">
          {/* Main content area with improved 2-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* Left column - Main content */}
            <div className="lg:col-span-8 space-y-6">
              {/* Customer section - with better alignment */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FormField
                      control={form.control}
                      name="contactId"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-1 mb-2">
                            <FormLabel className="text-sm font-medium">Customer</FormLabel>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </div>
                          <FormControl>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(parseInt(value));
                                handleContactChange(parseInt(value));
                              }} 
                              defaultValue={field.value?.toString()}
                            >
                              <SelectTrigger className="bg-white border-gray-300 h-10">
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
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <FormLabel className="text-sm font-medium">Customer email</FormLabel>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input 
                        className="bg-white border-gray-300 h-10" 
                        placeholder="Separate emails with a comma"
                        value={selectedContact?.email || ''}
                        readOnly
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
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
              </div>
              
              {/* Billing section - improved alignment */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <FormLabel className="text-sm font-medium block mb-2">Billing address</FormLabel>
                    <Textarea 
                      className="min-h-[120px] bg-white border-gray-300 resize-none" 
                      value={selectedContact?.address || ''}
                      readOnly
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <FormLabel className="text-sm font-medium">Terms</FormLabel>
                        <HelpCircle className="h-4 w-4 text-gray-400" />
                      </div>
                      <FormItem>
                        <FormControl>
                          <Select 
                            value={paymentTerms} 
                            onValueChange={(value) => handlePaymentTermsChange(value as PaymentTerms)}
                          >
                            <SelectTrigger className="bg-white border-gray-300 h-10">
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
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <FormLabel className="text-sm font-medium block mb-2">Invoice date</FormLabel>
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Input
                                    className="bg-white border-gray-300 h-10"
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
                      <FormLabel className="text-sm font-medium block mb-2">Due date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Input
                            className="bg-white border-gray-300 h-10"
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
              </div>
              
              {/* Tags section removed as requested */}
              
              {/* Line Items - improved table */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm font-medium">Line Items</div>
                  <FormItem>
                    <FormControl>
                      <Select defaultValue="exclusive">
                        <SelectTrigger className="w-44 bg-white border-gray-300 h-10">
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
                
                <div className="border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 grid grid-cols-12 gap-2 text-xs font-semibold p-3 border-b uppercase text-gray-600">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-3">Product/Service</div>
                    <div className="col-span-2">Description</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-1 text-center">Rate</div>
                    <div className="col-span-1 text-center">Amount</div>
                    <div className="col-span-2 text-center">Sales Tax</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {/* Line Items */}
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-12 gap-2 p-3 border-b items-center hover:bg-gray-50 transition-colors">
                      <div className="col-span-1 text-center text-sm text-gray-500">{index + 1}</div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`lineItems.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Select
                                  value={field.value ? field.value.toString() : 'none'}
                                  onValueChange={(value) => {
                                    // Handle product selection change
                                    if (value === 'none') {
                                      // Handle no selection
                                      field.onChange(undefined);
                                      form.setValue(`lineItems.${index}.description`, '');
                                      form.setValue(`lineItems.${index}.unitPrice`, 0);
                                      form.setValue(`lineItems.${index}.salesTaxId`, undefined);
                                      updateLineItemAmount(index);
                                    } else {
                                      const productId = parseInt(value);
                                      const product = typedProducts.find(p => p.id === productId);
                                      if (product) {
                                        // Set the product ID as string for form state
                                        field.onChange(value);
                                        // Set the product name as the description
                                        form.setValue(`lineItems.${index}.description`, product.name);
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
                                >
                                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-200 p-2 focus:ring-0 rounded-none h-10 hover:bg-gray-50">
                                    <SelectValue placeholder="Select a product/service">
                                      {field.value && field.value !== null ? (
                                        (() => {
                                          // Convert field.value to number for comparison since product IDs are numbers
                                          const productId = typeof field.value === 'string' ? parseInt(field.value) : field.value;
                                          const selectedProduct = typedProducts?.find(p => p.id === productId);
                                          return selectedProduct ? `${selectedProduct.name} ($${formatCurrency(selectedProduct.price)})` : "Select a product/service";
                                        })()
                                      ) : "Select a product/service"}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {productsLoading ? (
                                      <SelectItem value="loading" disabled>Loading products...</SelectItem>
                                    ) : typedProducts && typedProducts.length > 0 ? (
                                      <>
                                        <SelectItem value="none">Select a product/service</SelectItem>
                                        {typedProducts.map((product) => (
                                          <SelectItem key={product.id} value={product.id.toString()}>
                                            {product.name} (${formatCurrency(product.price)})
                                          </SelectItem>
                                        ))}
                                      </>
                                    ) : (
                                      <>
                                        <SelectItem value="none">Select a product/service</SelectItem>
                                        <SelectItem value="loading" disabled>No products available</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input 
                          className="bg-transparent border-0 border-b border-gray-200 p-2 focus:ring-0 hover:bg-gray-50" 
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
                                  className="bg-transparent border-0 border-b border-gray-200 p-2 text-center focus:ring-0 hover:bg-gray-50" 
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
                                  className="bg-transparent border-0 border-b border-gray-200 p-2 text-center focus:ring-0 hover:bg-gray-50" 
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
                                  className="bg-transparent border-0 border-b border-gray-200 p-2 text-center focus:ring-0 font-medium" 
                                  readOnly
                                  value={formatCurrency(field.value)}
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
                                  <SelectTrigger className="bg-transparent border-0 border-b border-gray-200 p-2 focus:ring-0 rounded-none h-10 hover:bg-gray-50">
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
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
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
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
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
                <div className="flex justify-end mt-6">
                  <div className="w-72 space-y-3 bg-gray-50 p-4 rounded-lg border">
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="font-medium">${formatCurrency(subTotal)}</span>
                    </div>
                    
                    {/* Tax Summary - Editable */}
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-sm">
                        {taxNames.length > 0 
                          ? taxNames.join(', ')  
                          : 'Tax'}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={manualTaxAmount !== null ? manualTaxAmount.toFixed(2) : taxAmount.toFixed(2)}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              setManualTaxAmount(roundTo2Decimals(value));
                              // Recalculate totals with manual tax
                              setTimeout(() => calculateTotals(), 0);
                            }
                          }}
                          onBlur={() => {
                            // Ensure value is rounded on blur
                            if (manualTaxAmount !== null) {
                              setManualTaxAmount(roundTo2Decimals(manualTaxAmount));
                            }
                          }}
                          className="w-24 h-8 text-right px-2 font-medium border-gray-300"
                        />
                      </div>
                    </div>
                    
                    {/* Show tax components breakdown if available (read-only, for info) */}
                    {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 && manualTaxAmount === null && (
                      <div className="pl-4 space-y-1">
                        {form.taxComponentsInfo.map((taxComponent: TaxComponentInfo) => (
                          <div key={taxComponent.id} className="flex justify-between items-center text-gray-600 text-xs">
                            <span>
                              {taxComponent.name} ({taxComponent.rate}%)
                            </span>
                            <span>${formatCurrency(taxComponent.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between border-t border-gray-300 pt-3">
                      <span className="text-sm font-semibold text-gray-900">Total</span>
                      <span className="font-semibold text-gray-900">${formatCurrency(totalAmount)}</span>
                    </div>
                    
                    {/* Unapplied Credits section - only show if customer has credits */}
                    {unappliedCredits.length > 0 && (
                      <div className="mt-3 border rounded-md p-3 bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Available Credits</span>
                          <span className="text-green-600 font-medium">${formatCurrency(totalUnappliedCredits)}</span>
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
                                    <span className="text-green-600">${formatCurrency(availableAmount)}</span>
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
                                      const amount = parseFloat(e.target.value);
                                      
                                      // Create a new array with updated credit to trigger React re-render
                                      const updatedCredits = unappliedCredits.map(c => {
                                        if (c.id === credit.id) {
                                          if (!isNaN(amount)) {
                                            const validAmount = Math.min(amount, availableAmount);
                                            const safeAmount = Math.max(0, validAmount);
                                            console.log("Credit input changed. Credit ID:", c.id, "Amount:", safeAmount);
                                            return { ...c, appliedAmount: safeAmount };
                                          } else {
                                            console.log("Credit input cleared. Credit ID:", c.id);
                                            return { ...c, appliedAmount: 0 };
                                          }
                                        }
                                        return c;
                                      });
                                      
                                      // Update state with new array to ensure React tracks changes
                                      setUnappliedCredits(updatedCredits);
                                      
                                      // Recalculate totals with updated credits array (pass immediately since state hasn't updated yet)
                                      calculateTotals(updatedCredits);
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
                            <span>${formatCurrency(appliedCreditAmount)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold border-t-2 border-gray-400 pt-3 mt-4 text-lg">
                      <span>Balance due</span>
                      <span>${formatCurrency(balanceDue)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Invoice message */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <FormLabel className="text-sm font-medium block mb-2">Message on invoice</FormLabel>
                <Textarea 
                  className="min-h-[100px] bg-white border-gray-300 resize-none" 
                  placeholder="Add a personal note or message for this invoice"
                />
              </div>
            </div>
            
            {/* Right column - Invoice details */}
            <div className="lg:col-span-4 space-y-6">
              {/* Balance Due Card */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Balance Due</div>
                  <div className="text-3xl font-bold text-gray-900">${formatCurrency(balanceDue)}</div>
                  {appliedCreditAmount > 0 && (
                    <div className="text-sm text-green-600 mt-2 font-medium">
                      Credits applied: ${formatCurrency(appliedCreditAmount)}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Invoice Number Card */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <FormLabel className="text-sm font-medium block mb-2">Invoice no.</FormLabel>
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input 
                          className="bg-white border-gray-300 h-10" 
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Attach Documents Card */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <FormLabel className="text-sm font-medium block mb-3">Attach documents</FormLabel>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                  <p className="text-xs text-gray-500 mt-2">Drag and drop files here</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, image files</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fixed footer - modernized */}
        <div className="border-t bg-white py-4 px-6 flex flex-col md:flex-row gap-3 justify-between z-50 shadow-lg sticky bottom-0 mt-auto">
          <Button type="button" variant="outline" onClick={onCancel} className="md:w-auto w-full h-10">
            Cancel
          </Button>
          
          <div className="flex flex-wrap md:flex-nowrap gap-2 md:space-x-2">
            <div className="flex md:hidden w-full justify-end">
              {/* Mobile save button */}
              <Button 
                type="submit"
                disabled={saveInvoice.isPending}
                className="w-full md:w-auto"
              >
                {saveInvoice.isPending ? 'Saving...' : 'Save and send'}
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
                  disabled={saveInvoice.isPending}
                >
                  {saveInvoice.isPending ? 'Saving...' : 'Save'}
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
