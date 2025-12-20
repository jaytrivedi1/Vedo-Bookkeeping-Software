import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Invoice as BaseInvoice, invoiceSchema, Contact, SalesTax, Product, Transaction as BaseTransaction } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { CURRENCIES } from "@shared/currencies";
import { formatContactName } from "@/lib/currencyUtils";

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
import { CalendarIcon, Plus, Trash2, XIcon, X, HelpCircle } from "lucide-react";

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
  initialDocumentType?: 'invoice' | 'quotation';
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

export default function InvoiceForm({ invoice, lineItems, onSuccess, onCancel, initialDocumentType }: InvoiceFormProps) {
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('0');
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [currentLineItemIndex, setCurrentLineItemIndex] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'quotation'>(
    invoice?.status === 'quotation' ? 'quotation' : (initialDocumentType || 'invoice')
  );

  // CC and BCC for email
  const [emailCC, setEmailCC] = useState<string>('');
  const [emailBCC, setEmailBCC] = useState<string>('');

  // Ref to track if this is a "Save & Send" action (avoids async state issues)
  const isSaveAndSendRef = useRef(false);

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
  
  // Fetch next invoice number from backend when creating a new invoice
  const { data: nextInvoiceData } = useQuery<{ nextNumber: string }>({
    queryKey: ['/api/invoices/next-number'],
    enabled: !isEditing,
  });
  
  const defaultInvoiceNumber = isEditing ? invoice?.reference : (nextInvoiceData?.nextNumber || '1001');

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
      label: formatContactName(contact.name, contact.currency, homeCurrency),
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
  
  // Update the reference field when next invoice number loads (only for new invoices)
  useEffect(() => {
    if (!isEditing && nextInvoiceData?.nextNumber) {
      form.setValue('reference', nextInvoiceData.nextNumber);
    }
  }, [nextInvoiceData, isEditing, form]);
  
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
        console.log("Updating invoice/quotation with data:", JSON.stringify(data, null, 2));
        return await apiRequest(`/api/invoices/${invoice?.id}`, 'PATCH', data);
      } else {
        console.log("Creating invoice/quotation with data:", JSON.stringify(data, null, 2));
        return await apiRequest('/api/invoices', 'POST', data);
      }
    },
    onSuccess: (result) => {
      const docType = documentType === 'quotation' ? 'Quotation' : 'Invoice';
      toast({
        title: `${docType} saved`,
        description: `${docType} has been saved successfully`,
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });

      // If Save & Send was clicked, navigate to invoice view with send dialog open
      if (isSaveAndSendRef.current && result?.id) {
        isSaveAndSendRef.current = false; // Reset the ref
        const basePath = documentType === 'quotation' ? '/quotations' : '/invoices';
        // Pass CC/BCC as query params so they can be pre-filled in the send dialog
        const params = new URLSearchParams({ openSendDialog: 'true' });
        if (emailCC) params.set('cc', emailCC);
        if (emailBCC) params.set('bcc', emailBCC);
        window.location.href = `${basePath}/${result.id}?${params.toString()}`;
        return;
      }

      // Normal save - go back
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
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

  // Update totals whenever line items change, tax mode changes, or credits are applied
  useEffect(() => {
    calculateTotals();
  }, [fields.length, isExclusiveOfTax, appliedCredits]);

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
      status: documentType === 'quotation' ? 'quotation' as const : 'open' as const, // Set status based on document type
      description: data.description || '',
      subTotal,
      taxAmount,
      totalAmount,
      paymentTerms,
      // Multi-currency fields
      currency,
      exchangeRate: exchangeRate.toString(), // Store as string to match schema
      foreignAmount: totalAmount, // Always set foreignAmount (equals totalAmount for home currency)
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Modern Compact Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2"
            >
              <XIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Close</span>
            </Button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-slate-900">
                {documentType === 'quotation' ? 'Quotation' : 'Invoice'} #{form.watch('reference')}
              </h1>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                Draft
              </span>
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">

            {/* Customer & Invoice Details - Horizontal Layout */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                {/* Left: Customer Selection */}
                <div className="p-6">
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Bill To</h2>
                  <FormField
                    control={form.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem>
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
                            className="bg-slate-50 border-slate-200 h-12 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                            disabled={contactsLoading}
                            onAddNew={() => setShowAddCustomerDialog(true)}
                            addNewText="Add New Customer"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Customer Details Preview */}
                  {selectedContact && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-sm text-slate-600 space-y-1">
                        {selectedContact.email && (
                          <p className="flex items-center gap-2">
                            <span className="text-slate-400">Email:</span>
                            <span className="font-medium text-slate-700">{selectedContact.email}</span>
                          </p>
                        )}
                        {selectedContact.address && (
                          <p className="flex items-start gap-2">
                            <span className="text-slate-400">Address:</span>
                            <span className="font-medium text-slate-700 whitespace-pre-line">{selectedContact.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CC Field */}
                  <div className="mt-4">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">CC (Optional)</FormLabel>
                    <Input
                      value={emailCC}
                      onChange={(e) => setEmailCC(e.target.value)}
                      placeholder="email1@example.com, email2@example.com"
                      className="bg-slate-50 border-slate-200 h-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                    />
                    <p className="text-xs text-slate-400 mt-1">Separate multiple emails with commas</p>
                  </div>

                  {/* BCC Field */}
                  <div className="mt-3">
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">BCC (Optional)</FormLabel>
                    <Input
                      value={emailBCC}
                      onChange={(e) => setEmailBCC(e.target.value)}
                      placeholder="archive@example.com"
                      className="bg-slate-50 border-slate-200 h-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                    />
                  </div>
                </div>

                {/* Right: Invoice Details */}
                <div className="p-6">
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Invoice Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Invoice Number */}
                    <div>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Invoice No.</FormLabel>
                      <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="bg-slate-50 border-slate-200 h-11 font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Invoice Date */}
                    <div>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Invoice Date</FormLabel>
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full h-11 justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                                    {field.value ? format(field.value, "MMM dd, yyyy") : "Select date"}
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

                    {/* Due Date */}
                    <div>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full h-11 justify-start text-left font-normal bg-slate-50 border-slate-200 hover:bg-slate-100 rounded-xl"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                            {format(dueDate, "MMM dd, yyyy")}
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

                    {/* Payment Terms - Full Width */}
                    <div className="col-span-2">
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Payment Terms</FormLabel>
                      <Select
                        value={paymentTerms}
                        onValueChange={(value) => handlePaymentTermsChange(value as PaymentTerms)}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
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
                    </div>

                    {/* Currency - if multi-currency enabled */}
                    {isMultiCurrencyEnabled && (
                      <>
                        <div className="col-span-2">
                          <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Currency</FormLabel>
                          <Select
                            value={currency}
                            onValueChange={(value) => setCurrency(value)}
                            disabled={isEditing || !!watchContactId}
                          >
                            <SelectTrigger className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl">
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
                        </div>

                        {currency !== homeCurrency && (
                          <div className="col-span-2">
                            <ExchangeRateInput
                              fromCurrency={currency}
                              toCurrency={homeCurrency}
                              value={exchangeRate}
                              onChange={handleExchangeRateChange}
                              isLoading={exchangeRateLoading}
                              date={invoiceDate}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Section - Modern Full Width */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Line Items</h2>
                <Select defaultValue="exclusive">
                  <SelectTrigger className="w-48 bg-slate-50 border-slate-200 h-10 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <SelectValue placeholder="Tax setting" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                    <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                    <SelectItem value="no-tax">No Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Modern Line Items */}
              <div className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-start gap-4">
                      {/* Line Number */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium text-slate-500 mt-1">
                        {index + 1}
                      </div>

                      {/* Main Content */}
                      <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-3">
                        {/* Product/Service */}
                        <div className="md:col-span-4">
                          <FormLabel className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Product/Service</FormLabel>
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
                                    placeholder="Select or search..."
                                    searchPlaceholder="Search products..."
                                    emptyText={productsLoading ? "Loading..." : "No products found"}
                                    disabled={productsLoading}
                                    className="bg-white border-slate-200 h-11 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-1">
                          <FormLabel className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Qty</FormLabel>
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="bg-white border-slate-200 h-11 text-center rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

                        {/* Rate */}
                        <div className="md:col-span-2">
                          <FormLabel className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Rate</FormLabel>
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.unitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    className="bg-white border-slate-200 h-11 text-right rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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

                        {/* Tax */}
                        <div className="md:col-span-3">
                          <FormLabel className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Tax</FormLabel>
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
                                    className="bg-white border-slate-200 h-11 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Amount - Display Only */}
                        <div className="md:col-span-2">
                          <FormLabel className="text-xs text-slate-400 uppercase tracking-wide mb-1.5 block">Amount</FormLabel>
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="h-11 flex items-center justify-end px-4 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 text-right whitespace-nowrap">
                                    ${formatCurrency(field.value)}
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-all mt-6"
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

              {/* Add Line Button */}
              <div className="px-6 py-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0, amount: 0 })}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add line item
                </Button>
              </div>

              {/* Notes/Attachments + Totals Section - Side by Side */}
              <div className="px-6 py-6 bg-slate-50 border-t border-slate-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Notes & Attachments */}
                  <div className="space-y-4">
                    {/* Notes */}
                    <div>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Message on Invoice</FormLabel>
                      <Textarea
                        className="min-h-[100px] bg-white border-slate-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Add a personal note or payment instructions..."
                      />
                    </div>

                    {/* Attachments */}
                    <div>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">Attachments</FormLabel>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer bg-white">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => document.getElementById('file-upload-invoice')?.click()}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Select files
                        </Button>
                        <input
                          type="file"
                          id="file-upload-invoice"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            console.log("Files selected:", e.target.files);
                          }}
                        />
                        <p className="text-xs text-slate-400 mt-2">or drag and drop</p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Totals */}
                  <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Subtotal</span>
                      <span className="text-sm font-medium text-slate-900">${formatCurrency(subTotal)}</span>
                    </div>

                    {/* Tax - Single consolidated display */}
                    {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 ? (
                      <div className="space-y-1">
                        {form.taxComponentsInfo.map((taxComponent: TaxComponentInfo) => (
                          <div key={taxComponent.id} className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">{taxComponent.name} ({taxComponent.rate}%)</span>
                            <span className="text-sm font-medium text-slate-900">${formatCurrency(taxComponent.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Tax</span>
                        <span className="text-sm font-medium text-slate-900">${formatCurrency(taxAmount)}</span>
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-slate-300">
                      <span className="text-base font-semibold text-slate-900">Total</span>
                      <span className="text-lg font-bold text-slate-900">${formatCurrency(totalAmount)}</span>
                    </div>

                    {/* Applied Credits */}
                    {appliedCredits.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {appliedCredits.map(ac => (
                          <div key={ac.creditId} className="flex justify-between items-center text-slate-600">
                            <span className="text-sm">Credit #{ac.creditId}</span>
                            <span className="text-sm font-medium text-emerald-600">-${formatCurrency(ac.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Balance Due - Highlighted */}
                    <div className="flex justify-between items-center pt-3 mt-2 border-t-2 border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100 -mx-4 px-4 py-4 rounded-xl">
                      <span className="text-base font-bold text-blue-900">Balance Due</span>
                      {currency !== homeCurrency ? (
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-700">
                            {CURRENCIES.find(c => c.code === currency)?.symbol || currency}{formatCurrency(balanceDue)}
                          </div>
                          <div className="text-xs text-blue-500">
                            ≈ {CURRENCIES.find(c => c.code === homeCurrency)?.symbol || homeCurrency}{formatCurrency(balanceDue * exchangeRate)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xl font-bold text-blue-700">${formatCurrency(balanceDue)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credits Section - Only show if there are unapplied credits */}
            {unappliedCredits.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Available Credits</h2>
                  <span className="text-sm font-medium text-emerald-600">
                    ${formatCurrency(unappliedCredits.reduce((sum, c) => sum + Math.abs(c.balance || 0), 0))} available
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {unappliedCredits.filter(c => !appliedCredits.some(ac => ac.creditId === c.id)).map(credit => (
                      <div key={credit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div>
                          <div className="text-sm font-medium text-slate-900">Credit #{credit.id}</div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(credit.date), 'MMM dd, yyyy')} · ${formatCurrency(Math.abs(credit.balance || 0))}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addCredit(credit)}
                          className="rounded-lg border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                          data-testid={`button-add-credit-${credit.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
        
        {/* Modern Sticky Footer */}
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur-sm py-3 px-4 md:px-6 sticky bottom-0 z-20 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left: Cancel */}
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="hidden sm:flex text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              data-testid="button-cancel"
            >
              Cancel
            </Button>

            {/* Center: Balance Display */}
            <div className="flex items-center gap-4 order-first sm:order-none">
              <div className="text-center sm:text-right">
                <div className="text-xs text-slate-500 uppercase tracking-wide">Balance Due</div>
                <div className="text-xl font-bold text-slate-900">
                  {currency !== homeCurrency ? (
                    <>
                      {CURRENCIES.find(c => c.code === currency)?.symbol || currency}{formatCurrency(balanceDue)}
                    </>
                  ) : (
                    <>${formatCurrency(balanceDue)}</>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Mobile Cancel */}
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="sm:hidden flex-1 h-11 border-slate-200"
                data-testid="button-cancel-mobile"
              >
                Cancel
              </Button>

              {/* Save Button */}
              <Button
                type="submit"
                disabled={saveInvoice.isPending}
                variant="outline"
                className="flex-1 sm:flex-none h-11 border-slate-300 hover:bg-slate-50 transition-colors px-6"
                data-testid="button-save"
              >
                {saveInvoice.isPending ? 'Saving...' : 'Save'}
              </Button>

              {/* Save & Send Button */}
              <Button
                type="button"
                disabled={saveInvoice.isPending}
                className="flex-1 sm:flex-none h-11 bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm px-6"
                onClick={() => {
                  isSaveAndSendRef.current = true;
                  form.handleSubmit(onSubmit)();
                }}
                data-testid="button-save-send"
              >
                {saveInvoice.isPending ? 'Saving...' : 'Save & Send'}
              </Button>
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
