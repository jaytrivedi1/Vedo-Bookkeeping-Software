import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice as BaseInvoice, invoiceSchema, Contact, SalesTax, Product, Transaction as BaseTransaction } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { CURRENCIES } from "@shared/currencies";

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
import { CalendarIcon, Plus, Trash2, SendIcon, XIcon, X, HelpCircle, Settings } from "lucide-react";

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
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
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
import AddCustomerDialog from "@/components/dialogs/AddCustomerDialog";
import AddProductDialog from "@/components/dialogs/AddProductDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";

interface InvoiceFormProps {
  invoice?: any; // Transaction object from database
  lineItems?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

type PaymentTerms = '0' | '7' | '14' | '30' | '60' | 'custom';

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
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('0');
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [currentLineItemIndex, setCurrentLineItemIndex] = useState<number | null>(null);
  
  // Initialize based on mode (create vs edit)
  const isEditing = Boolean(invoice);
  const initialDate = isEditing ? new Date(invoice!.date) : new Date();
  const initialDueDate = isEditing && invoice!.dueDate ? new Date(invoice!.dueDate) : addDays(initialDate, 0);
  
  const [dueDate, setDueDate] = useState<Date>(initialDueDate);
  const [subTotal, setSubTotal] = useState(isEditing ? (invoice?.subTotal || invoice?.amount || 0) : 0);
  const [taxAmount, setTaxAmount] = useState(isEditing ? (invoice?.taxAmount || 0) : 0);
  const [manualTaxAmount, setManualTaxAmount] = useState<number | null>(isEditing && invoice?.taxAmount !== undefined ? invoice.taxAmount : null); // null means use calculated tax, use saved tax when editing
  const [totalAmount, setTotalAmount] = useState(isEditing ? (invoice?.amount || 0) : 0);
  const [balanceDue, setBalanceDue] = useState(isEditing ? (invoice?.balance || invoice?.amount || 0) : 0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [watchContactId, setWatchContactId] = useState<number | undefined>(invoice?.contactId);
  const [unappliedCredits, setUnappliedCredits] = useState<Transaction[]>([]);
  const [appliedCredits, setAppliedCredits] = useState<Array<{creditId: number, amount: number, credit: Transaction}>>([]);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  
  // Multi-currency state
  const [currency, setCurrency] = useState<string>(invoice?.currency || 'USD');
  const [exchangeRate, setExchangeRate] = useState<number>(invoice?.exchangeRate ? parseFloat(invoice.exchangeRate) : 1);
  const [showCurrencyInfo, setShowCurrencyInfo] = useState(false);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);
  
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

  // Transform sales taxes for SearchableSelect (filter main taxes only)
  const taxItems: SearchableSelectItem[] = salesTaxes?.filter(tax => !tax.parentId).map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined
  })) || [];
  
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });
  
  // Fetch customer's unapplied credits when a contact is selected
  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!watchContactId,
  });
  
  // Fetch payment applications for this invoice when editing
  const { data: paymentApplications } = useQuery<any[]>({
    queryKey: ['/api/invoices', invoice?.id, 'payment-applications'],
    enabled: isEditing && !!invoice?.id,
  });
  
  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });
  
  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;
  
  // Initialize currency to homeCurrency when preferences load
  useEffect(() => {
    if (homeCurrency && !isEditing && !invoice?.currency) {
      setCurrency(homeCurrency);
    }
  }, [homeCurrency, isEditing, invoice?.currency]);
  
  // Update currency when customer changes (if not editing)
  useEffect(() => {
    if (!isEditing && watchContactId && contacts && isMultiCurrencyEnabled) {
      const customer = contacts.find(c => c.id === watchContactId);
      if (customer && customer.currency) {
        setCurrency(customer.currency);
      } else {
        setCurrency(homeCurrency);
      }
    }
  }, [watchContactId, contacts, isEditing, isMultiCurrencyEnabled, homeCurrency]);
  
  // Keep currency in sync with homeCurrency when multi-currency is disabled
  useEffect(() => {
    if (!isMultiCurrencyEnabled && homeCurrency && !isEditing) {
      setCurrency(homeCurrency);
    }
  }, [isMultiCurrencyEnabled, homeCurrency, isEditing]);
  
  // Filter for unapplied credits for the selected customer
  useEffect(() => {
    if (watchContactId && transactions) {
      const customerCredits = transactions.filter(transaction => {
        // Show any transaction with unapplied_credit status for this customer
        // regardless of balance sign (we use Math.abs() for display anyway)
        return transaction.status === 'unapplied_credit' && 
          transaction.contactId === Number(watchContactId) &&
          transaction.balance !== null && 
          transaction.balance !== 0;
      });
      
      setUnappliedCredits(customerCredits);
      
      // If editing, pre-populate applied credits from payment_applications
      if (isEditing && paymentApplications && paymentApplications.length > 0) {
        const initialApplied = paymentApplications.map(app => ({
          creditId: app.paymentId,
          amount: app.amountApplied,
          credit: app.payment
        }));
        setAppliedCredits(initialApplied);
      }
    } else {
      setUnappliedCredits([]);
      setAppliedCredits([]);
    }
  }, [watchContactId, transactions, paymentApplications, isEditing]);
  
  // Ensure products are properly typed
  const typedProducts = products?.map(product => ({
    ...product,
    price: typeof product.price === 'number' ? product.price : 0
  })) || [];

  // Transform products into SearchableSelectItem format
  const productItems: SearchableSelectItem[] = typedProducts.map(product => ({
    value: product.id.toString(),
    label: `${product.name} (${formatCurrency(product.price)})`,
    subtitle: undefined
  }));

  // Transform contacts into SearchableSelectItem format for customer dropdown (filtered)
  const customerItems: SearchableSelectItem[] = contacts
    ?.filter(contact => contact.type === 'customer' || contact.type === 'both')
    .map(contact => ({
      value: contact.id.toString(),
      label: contact.name,
      subtitle: `· ${contact.type}`
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
  
  // Fetch exchange rate when currency or date changes
  const invoiceDate = form.watch("date") || new Date();
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: currency, toCurrency: homeCurrency, date: invoiceDate }],
    enabled: isMultiCurrencyEnabled && currency !== homeCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${currency}&toCurrency=${homeCurrency}&date=${format(invoiceDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
        // If no exchange rate found, return null to show warning
        if (response.status === 404) return null;
        throw new Error('Failed to fetch exchange rate');
      }
      return response.json();
    },
  });
  
  // Update exchange rate when exchange rate data changes
  useEffect(() => {
    if (exchangeRateData && exchangeRateData.rate) {
      setExchangeRate(parseFloat(exchangeRateData.rate));
    } else if (currency === homeCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, currency, homeCurrency]);

  // Handle exchange rate changes from the ExchangeRateInput component
  const handleExchangeRateChange = (newRate: number, shouldUpdate: boolean) => {
    if (shouldUpdate) {
      setPendingExchangeRate(newRate);
      setShowExchangeRateDialog(true);
    } else {
      setExchangeRate(newRate);
    }
  };

  // Handle exchange rate update dialog confirmation
  const handleExchangeRateUpdate = async (scope: 'transaction_only' | 'all_on_date') => {
    if (pendingExchangeRate === null) return;

    if (scope === 'transaction_only') {
      // Just update the local state for this transaction
      setExchangeRate(pendingExchangeRate);
      toast({
        title: "Exchange rate updated",
        description: "The rate has been updated for this transaction only.",
      });
    } else {
      // Update the exchange rate in the database for all transactions on this date
      try {
        await apiRequest('PUT', '/api/exchange-rates', {
          fromCurrency: currency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(invoiceDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        
        // Invalidate exchange rates cache
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates/rate'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all ${currency} transactions on ${format(invoiceDate, 'dd/MM/yyyy')}.`,
        });
      } catch (error) {
        console.error('Error updating exchange rate:', error);
        toast({
          title: "Error",
          description: "Failed to update exchange rate. Please try again.",
          variant: "destructive",
        });
      }
    }

    setPendingExchangeRate(null);
    setShowExchangeRateDialog(false);
  };

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

  // Reset form when invoice data loads (fixes empty form on navigation)
  useEffect(() => {
    if (isEditing && invoice && lineItems) {
      form.reset({
        date: new Date(invoice.date),
        contactId: invoice.contactId,
        reference: invoice.reference,
        description: invoice.description || '',
        status: invoice.status as "open" | "paid" | "overdue" | "partial",
        lineItems: lineItems.length ? lineItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
          productId: item.productId !== null && item.productId !== undefined ? String(item.productId) : undefined
        })) : [{ description: '', quantity: 1, unitPrice: 0, amount: 0, salesTaxId: undefined, productId: undefined }],
      });
    }
  }, [invoice, lineItems, isEditing, form]);

  // Credit management functions
  const addCredit = (credit: Transaction) => {
    // Don't add if already applied
    if (appliedCredits.some(ac => ac.creditId === credit.id)) {
      return;
    }
    
    // Add credit with maximum available amount
    const maxAmount = Math.abs(credit.balance || 0);
    setAppliedCredits(prev => [...prev, {
      creditId: credit.id,
      amount: maxAmount,
      credit
    }]);
    
    // Recalculate balance
    calculateTotals();
  };
  
  const removeCredit = (creditId: number) => {
    setAppliedCredits(prev => prev.filter(ac => ac.creditId !== creditId));
    // Recalculate balance
    calculateTotals();
  };
  
  const updateCreditAmount = (creditId: number, newAmount: number) => {
    setAppliedCredits(prev => prev.map(ac => 
      ac.creditId === creditId 
        ? { ...ac, amount: Math.max(0, Math.min(newAmount, Math.abs(ac.credit.balance || 0))) }
        : ac
    ));
    // Recalculate balance
    calculateTotals();
  };

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

  const calculateTotals = (manualTaxOverride?: number | null) => {
    const lineItems = form.getValues('lineItems');
    
    let calculatedSubtotal = 0;
    let totalTaxAmount = 0;
    const taxComponents = new Map<number, TaxComponentInfo>();
    const usedTaxes = new Map<number, SalesTax>();
    
    lineItems.forEach((item) => {
      const itemAmount = item.amount || 0;
      
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            if (components.length > 0) {
              let itemTotalTax = 0;
              components.forEach(component => {
                let componentTaxAmount: number;
                if (isExclusiveOfTax) {
                  componentTaxAmount = roundTo2Decimals(itemAmount * (component.rate / 100));
                } else {
                  componentTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + component.rate));
                }
                itemTotalTax = roundTo2Decimals(itemTotalTax + componentTaxAmount);
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
              
              // Calculate subtotal for this line item
              if (isExclusiveOfTax) {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
              } else {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTotalTax));
              }
              
              usedTaxes.set(salesTax.id, salesTax);
            } else {
              let itemTaxAmount: number;
              if (isExclusiveOfTax) {
                itemTaxAmount = roundTo2Decimals(itemAmount * (salesTax.rate / 100));
              } else {
                itemTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + salesTax.rate));
              }
              totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
              
              // Calculate subtotal for this line item
              if (isExclusiveOfTax) {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
              } else {
                calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTaxAmount));
              }
              
              usedTaxes.set(salesTax.id, salesTax);
              
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
            let itemTaxAmount: number;
            if (isExclusiveOfTax) {
              itemTaxAmount = roundTo2Decimals(itemAmount * (salesTax.rate / 100));
            } else {
              itemTaxAmount = roundTo2Decimals(itemAmount - (itemAmount * 100) / (100 + salesTax.rate));
            }
            totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
            
            // Calculate subtotal for this line item
            if (isExclusiveOfTax) {
              calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
            } else {
              calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + (itemAmount - itemTaxAmount));
            }
            
            usedTaxes.set(salesTax.id, salesTax);
            
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
      } else {
        // No tax on this line item - add full amount to subtotal
        calculatedSubtotal = roundTo2Decimals(calculatedSubtotal + itemAmount);
      }
    });
    
    // Use manual tax amount if set, otherwise use calculated tax
    // Priority: 1) manualTaxOverride parameter (null = use calculated), 2) manualTaxAmount state, 3) calculated tax
    const finalTaxAmount = manualTaxOverride !== undefined 
      ? (manualTaxOverride === null ? totalTaxAmount : manualTaxOverride)
      : (manualTaxAmount !== null ? manualTaxAmount : totalTaxAmount);
    // Total is always subtotal + tax
    const total = roundTo2Decimals(calculatedSubtotal + finalTaxAmount);
    
    // Get all unique tax names used in this invoice
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    
    // Convert tax components map to array and sort by displayOrder if available
    const taxComponentsArray = Array.from(taxComponents.values());
    
    // Store in a property accessible during form rendering
    form.taxComponentsInfo = taxComponentsArray;
    
    console.log("Calculating totals:", { 
      calculatedSubtotal, 
      totalTaxAmount, 
      manualTaxAmount,
      finalTaxAmount,
      total,
      lineItems,
      taxNames: taxNameList,
      taxComponents: taxComponentsArray
    });
    
    // Make sure to persist these values
    setSubTotal(calculatedSubtotal);
    setTaxAmount(finalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
    
    // Calculate balance due (total - applied credits)
    // Sum all applied credits from the appliedCredits array
    const totalAppliedCredits = appliedCredits.reduce((sum, ac) => sum + ac.amount, 0);
    
    console.log("Total applied credits:", totalAppliedCredits, "from", appliedCredits.length, "credits");
    
    // Calculate balance due: total - applied credits
    const newBalanceDue = roundTo2Decimals(total - totalAppliedCredits);
    
    console.log("Balance calculation:", {
      total,
      totalAppliedCredits,
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

  // Update totals whenever line items change or tax mode changes
  useEffect(() => {
    calculateTotals();
  }, [fields.length, isExclusiveOfTax]);

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
      paymentTerms,
      // Multi-currency fields
      currency,
      exchangeRate: exchangeRate.toString(), // Store as string to match schema
      foreignAmount: currency !== homeCurrency ? totalAmount : null, // Only set foreignAmount if using foreign currency
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
    if (appliedCredits.length > 0) {
      const totalApplied = appliedCredits.reduce((sum, ac) => sum + ac.amount, 0);
      backendPayload.appliedCreditAmount = totalApplied;
      
      // Map appliedCredits to backend format
      backendPayload.appliedCredits = appliedCredits.map(ac => ({
        id: ac.creditId,
        amount: ac.amount
      }));
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
                            <SearchableSelect
                              items={customerItems}
                              value={field.value?.toString() || ""}
                              onValueChange={(value) => {
                                const contactId = parseInt(value);
                                field.onChange(contactId);
                                handleContactChange(contactId);
                              }}
                              placeholder="Select a customer"
                              emptyText={contactsLoading ? "Loading contacts..." : "No customers found"}
                              searchPlaceholder="Search customers..."
                              className="bg-white border-gray-300 h-10"
                              disabled={contactsLoading}
                              onAddNew={() => setShowAddCustomerDialog(true)}
                              addNewText="Add New Customer"
                            />
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
                              <SelectItem value="0">Due upon receipt</SelectItem>
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
                    
                    {isMultiCurrencyEnabled && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center gap-1 mb-2">
                            <FormLabel className="text-sm font-medium">Currency</FormLabel>
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                          </div>
                          <FormItem>
                            <FormControl>
                              <Select 
                                value={currency} 
                                onValueChange={(value) => setCurrency(value)}
                                disabled={isEditing}
                              >
                                <SelectTrigger className="bg-white border-gray-300 h-10">
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CURRENCIES.map(curr => (
                                    <SelectItem key={curr.code} value={curr.code}>
                                      {curr.code} - {curr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          </FormItem>
                        </div>
                        
                        {currency !== homeCurrency && (
                          <ExchangeRateInput
                            fromCurrency={currency}
                            toCurrency={homeCurrency}
                            value={exchangeRate}
                            onChange={handleExchangeRateChange}
                            isLoading={exchangeRateLoading}
                            date={invoiceDate}
                          />
                        )}
                      </div>
                    )}
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
                                <SearchableSelect
                                  items={productItems}
                                  value={field.value ? field.value.toString() : ''}
                                  onValueChange={(value) => {
                                    if (!value) {
                                      field.onChange(undefined);
                                      form.setValue(`lineItems.${index}.description`, '');
                                      form.setValue(`lineItems.${index}.unitPrice`, 0);
                                      form.setValue(`lineItems.${index}.salesTaxId`, undefined);
                                      updateLineItemAmount(index);
                                    } else {
                                      const productId = parseInt(value);
                                      const product = typedProducts.find(p => p.id === productId);
                                      if (product) {
                                        field.onChange(value);
                                        form.setValue(`lineItems.${index}.description`, product.name);
                                        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(product.price.toString()));
                                        
                                        if (product.salesTaxId) {
                                          form.setValue(`lineItems.${index}.salesTaxId`, product.salesTaxId);
                                        }
                                        
                                        updateLineItemAmount(index);
                                      }
                                    }
                                  }}
                                  onAddNew={() => {
                                    setCurrentLineItemIndex(index);
                                    setShowAddProductDialog(true);
                                  }}
                                  addNewText="Add New Product/Service"
                                  placeholder="Select product/service"
                                  searchPlaceholder="Search products..."
                                  emptyText={productsLoading ? "Loading..." : "No products found"}
                                  disabled={productsLoading}
                                  className="bg-transparent border-0 border-b border-gray-200 rounded-none"
                                />
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
                                <SearchableSelect
                                  items={taxItems}
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
                                  placeholder="Select Tax"
                                  searchPlaceholder="Search taxes..."
                                  emptyText={salesTaxesLoading ? "Loading..." : "No taxes found."}
                                  className="bg-transparent border-0 border-b border-gray-200 p-2 focus:ring-0 rounded-none h-10 hover:bg-gray-50"
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
                            if (!isNaN(value) && e.target.value.trim() !== '') {
                              const roundedValue = roundTo2Decimals(value);
                              setManualTaxAmount(roundedValue);
                              // Pass the value directly to avoid state timing issues
                              calculateTotals(roundedValue);
                            } else {
                              // If empty or invalid, clear the manual override
                              setManualTaxAmount(null);
                              // Pass null to explicitly use calculated tax
                              calculateTotals(null);
                            }
                          }}
                          onBlur={(e) => {
                            // Ensure value is rounded on blur, or cleared if empty
                            if (e.target.value.trim() === '') {
                              setManualTaxAmount(null);
                              // Pass null to explicitly use calculated tax
                              calculateTotals(null);
                            } else if (manualTaxAmount !== null) {
                              const roundedValue = roundTo2Decimals(manualTaxAmount);
                              setManualTaxAmount(roundedValue);
                              calculateTotals(roundedValue);
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
                    
                    {/* Applied credits with editable amounts */}
                    {appliedCredits.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-300">
                        {appliedCredits.map(ac => (
                          <div key={ac.creditId} className="flex justify-between items-center text-gray-700">
                            <span className="text-sm">Credit #{ac.creditId}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-green-600">-$</span>
                              <Input
                                type="number"
                                min="0"
                                max={Math.abs(ac.credit.balance || 0) + ac.amount}
                                step="0.01"
                                value={ac.amount}
                                onChange={(e) => updateCreditAmount(ac.creditId, parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 text-right px-2 text-sm text-green-600 font-medium border-gray-300"
                                data-testid={`input-credit-amount-totals-${ac.creditId}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold border-t-2 border-gray-400 pt-3 mt-4 text-lg">
                      <span>Balance due</span>
                      {currency !== homeCurrency ? (
                        <div className="text-right">
                          <div>{CURRENCIES.find(c => c.code === currency)?.symbol || currency}{formatCurrency(balanceDue)}</div>
                          <div className="text-xs font-normal text-gray-500">
                            ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{formatCurrency(balanceDue * exchangeRate)}
                          </div>
                        </div>
                      ) : (
                        <span>${formatCurrency(balanceDue)}</span>
                      )}
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
                  {currency !== homeCurrency ? (
                    <div>
                      <div className="text-3xl font-bold text-gray-900">
                        {CURRENCIES.find(c => c.code === currency)?.symbol || currency}{formatCurrency(balanceDue)}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{formatCurrency(balanceDue * exchangeRate)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">${formatCurrency(balanceDue)}</div>
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
              
              {/* Available Credits Panel */}
              {(unappliedCredits.length > 0 || appliedCredits.length > 0) && (
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Available Credits</div>
                    {unappliedCredits.length === 0 && appliedCredits.length > 0 ? (
                      <div className="text-xs text-gray-500">No additional credits available</div>
                    ) : (
                      <div className="text-sm text-green-600 font-medium">
                        ${formatCurrency(unappliedCredits.reduce((sum, c) => sum + Math.abs(c.balance || 0), 0))}
                      </div>
                    )}
                  </div>
                  
                  {/* List of unapplied credits with add button - with scrolling */}
                  <div className="max-h-48 overflow-y-auto">
                    {unappliedCredits.filter(c => !appliedCredits.some(ac => ac.creditId === c.id)).map(credit => (
                      <div key={credit.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-grow">
                          <div className="text-sm font-medium">Credit #{credit.id}</div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(credit.date), 'MMM dd, yyyy')} - ${formatCurrency(Math.abs(credit.balance || 0))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addCredit(credit)}
                          className="ml-2"
                          data-testid={`button-add-credit-${credit.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Applied credits with remove button - with scrolling */}
                  {appliedCredits.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-medium mb-2">Applied to this invoice</div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {appliedCredits.map(ac => (
                          <div key={ac.creditId} className="flex items-center gap-2 py-2">
                            <div className="flex-grow">
                              <div className="text-sm">Credit #{ac.creditId}</div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(ac.credit.date), 'MMM dd, yyyy')} - ${formatCurrency(Math.abs(ac.credit.balance || 0))} available
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCredit(ac.creditId)}
                              data-testid={`button-remove-credit-${ac.creditId}`}
                            >
                              <X className="h-4 w-4 text-gray-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t font-medium text-green-600">
                        <span>Total Applied:</span>
                        <span>${formatCurrency(appliedCredits.reduce((sum, ac) => sum + ac.amount, 0))}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
      
      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onSuccess={(customerId) => {
          form.setValue('contactId', customerId);
          handleContactChange(customerId);
          queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
        }}
      />

      <AddProductDialog
        open={showAddProductDialog}
        onOpenChange={setShowAddProductDialog}
        onSuccess={(product) => {
          if (currentLineItemIndex !== null) {
            // Set the product ID and populate the line item with the new product data
            form.setValue(`lineItems.${currentLineItemIndex}.productId`, product.id.toString());
            form.setValue(`lineItems.${currentLineItemIndex}.description`, product.name);
            form.setValue(`lineItems.${currentLineItemIndex}.unitPrice`, parseFloat(product.price.toString()));
            
            if (product.salesTaxId) {
              form.setValue(`lineItems.${currentLineItemIndex}.salesTaxId`, product.salesTaxId);
            }
            
            updateLineItemAmount(currentLineItemIndex);
            
            // Invalidate products query to refresh the list
            queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          }
        }}
      />

      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        fromCurrency={currency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={invoiceDate}
        onConfirm={handleExchangeRateUpdate}
      />
    </Form>
  );
}
