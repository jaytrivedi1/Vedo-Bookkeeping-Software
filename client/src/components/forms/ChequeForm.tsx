import { useState, useEffect } from "react";
import { useForm, useFieldArray, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { chequeSchema, Contact, SalesTax, Account, Transaction } from "@shared/schema";
import { roundTo2Decimals, formatCurrency } from "@shared/utils";
import { validateAccountContactRequirement, hasAccountsPayableOrReceivable } from "@/lib/accountValidation";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { CalendarIcon, Plus, Trash2, XIcon, Upload } from "lucide-react";

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
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
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
import { useToast } from "@/hooks/use-toast";

interface FormLineItem {
  accountId?: number;
  description: string;
  amount: number;
  salesTaxId?: number;
}

interface Cheque {
  date: Date;
  contactId: number;
  reference?: string;
  description?: string;
  status: "open" | "completed" | "cancelled";
  paymentAccountId: number;
  paymentDate?: Date;
  memo?: string;
  lineItems: FormLineItem[];
  subTotal?: number;
  taxAmount?: number;
  totalAmount?: number;
}

interface TaxComponentInfo {
  id: number;
  name: string;
  rate: number;
  amount: number;
  isComponent: boolean;
  parentId?: number;
}

interface ChequeFormType extends UseFormReturn<Cheque> {
  taxComponentsInfo?: TaxComponentInfo[];
}

interface ChequeFormProps {
  cheque?: Transaction;
  lineItems?: any[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ChequeForm({ cheque, lineItems, onSuccess, onCancel }: ChequeFormProps) {
  const isEditing = Boolean(cheque);
  const initialDate = isEditing ? new Date(cheque!.date) : new Date();
  const initialPaymentDate = isEditing && cheque!.paymentDate ? new Date(cheque!.paymentDate) : new Date();
  
  const [subTotal, setSubTotal] = useState(isEditing ? (cheque?.subTotal || cheque?.amount || 0) : 0);
  const [taxAmount, setTaxAmount] = useState(isEditing ? (cheque?.taxAmount || 0) : 0);
  const [manualTaxAmount, setManualTaxAmount] = useState<number | null>(isEditing && cheque?.taxAmount !== undefined ? cheque.taxAmount : null);
  const [totalAmount, setTotalAmount] = useState(isEditing ? (cheque?.amount || 0) : 0);
  const [taxNames, setTaxNames] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [manualComponentAmounts, setManualComponentAmounts] = useState<Record<number, number>>({});
  const [payeeAddress, setPayeeAddress] = useState<string>("");
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [accountDialogContext, setAccountDialogContext] = useState<{type: 'payment' | 'lineItem', index?: number} | null>(null);
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);
  const { toast } = useToast();

  const defaultChequeNumber = isEditing ? cheque?.reference : '';

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });
  
  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Transform sales taxes for SearchableSelect (filter main taxes only)
  const taxItems: SearchableSelectItem[] = [
    { value: '0', label: 'None', subtitle: undefined },
    ...(salesTaxes?.filter(tax => !tax.parentId).map(tax => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    })) || [])
  ];
  
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const payees = contacts || [];
  const allAccounts = accounts?.filter(account => account.code !== '3999') || [];
  const bankAccounts = accounts?.filter(account => 
    account.type === 'bank'
  ) || [];

  // Transform contacts into SearchableSelectItem format
  const contactItems: SearchableSelectItem[] = contacts?.map(contact => ({
    value: contact.id.toString(),
    label: contact.name,
    subtitle: `· ${contact.type}`
  })) || [];

  // Transform bank accounts into SearchableSelectItem format
  const bankAccountItems: SearchableSelectItem[] = bankAccounts.map(account => ({
    value: account.id.toString(),
    label: `${account.name} (${account.type})`,
    subtitle: undefined
  }));

  // Transform all accounts into SearchableSelectItem format
  const allAccountItems: SearchableSelectItem[] = allAccounts.map(account => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  // Transform payment methods into SearchableSelectItem format
  const paymentMethodItems: SearchableSelectItem[] = [
    { value: "cash", label: "Cash", subtitle: undefined },
    { value: "check", label: "Check", subtitle: undefined },
    { value: "credit_card", label: "Credit Card", subtitle: undefined },
    { value: "bank_transfer", label: "Bank Transfer", subtitle: undefined },
    { value: "other", label: "Other", subtitle: undefined }
  ];

  const form = useForm<Cheque>({
    resolver: zodResolver(chequeSchema),
    defaultValues: isEditing ? {
      date: initialDate,
      contactId: cheque?.contactId || 0,
      reference: cheque?.reference || '',
      description: cheque?.description || '',
      status: 'completed' as const,
      paymentAccountId: cheque?.paymentAccountId || 0,
      paymentDate: initialPaymentDate,
      memo: cheque?.memo || '',
      lineItems: lineItems?.length ? lineItems.map(item => ({
        accountId: item.accountId || undefined,
        description: item.description,
        amount: item.amount,
        salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
      })) : [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
    } : {
      date: initialDate,
      contactId: 0,
      reference: defaultChequeNumber,
      description: '',
      status: 'completed' as const,
      paymentAccountId: 0,
      paymentDate: initialPaymentDate,
      memo: '',
      lineItems: [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
    },
  }) as ChequeFormType;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Update payee address when contact is selected
  useEffect(() => {
    const selectedContactId = form.watch('contactId');
    if (selectedContactId) {
      const selectedContact = contacts?.find(c => c.id === selectedContactId);
      setPayeeAddress(selectedContact?.address || '');
    }
  }, [form.watch('contactId'), contacts]);

  useEffect(() => {
    if (isEditing && lineItems?.length && cheque) {
      const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxTotal = (cheque.amount || 0) - subtotal;
      
      setSubTotal(subtotal);
      setTaxAmount(taxTotal);
      setTotalAmount(cheque.amount || 0);
      
      // Set initial payee address
      if (cheque.contactId && contacts) {
        const contact = contacts.find(c => c.id === cheque.contactId);
        if (contact) {
          setPayeeAddress(contact.address || '');
        }
      }
    }
  }, [isEditing, lineItems, cheque, contacts]);

  // Reset form when cheque data loads (fixes empty form on navigation)
  useEffect(() => {
    if (isEditing && cheque && lineItems) {
      form.reset({
        date: new Date(cheque.date),
        contactId: cheque.contactId || 0,
        reference: cheque.reference || '',
        description: cheque.description || '',
        status: 'completed' as const,
        paymentAccountId: cheque.paymentAccountId || 0,
        paymentDate: cheque.paymentDate ? new Date(cheque.paymentDate) : new Date(cheque.date),
        memo: cheque.memo || '',
        lineItems: lineItems.length ? lineItems.map(item => ({
          accountId: item.accountId || undefined,
          description: item.description,
          amount: item.amount,
          salesTaxId: item.salesTaxId !== null ? item.salesTaxId : undefined,
        })) : [{ accountId: undefined, description: '', amount: 0, salesTaxId: undefined }],
      });
    }
  }, [cheque, lineItems, isEditing, form]);

  const saveCheque = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        console.log("Updating cheque with data:", JSON.stringify(data, null, 2));
        return await apiRequest(`/api/transactions/${cheque?.id}`, 'PATCH', data);
      } else {
        console.log("Creating cheque with data:", JSON.stringify(data, null, 2));
        return await apiRequest('/api/cheques', 'POST', data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Cheque saved",
        description: "Cheque has been saved successfully",
        variant: "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error("Error saving cheque:", error);
      toast({
        title: "Error saving cheque",
        description: error?.message || "There was a problem saving the cheque. Please try again.",
        variant: "destructive",
      });
    }
  });

  const calculateTotals = (manualTaxOverride?: number | null) => {
    const lineItems = form.getValues('lineItems');
    const subtotal = roundTo2Decimals(lineItems.reduce((sum, item) => sum + (item.amount || 0), 0));
    
    let totalTaxAmount = 0;
    const taxComponents = new Map<number, TaxComponentInfo>();
    const usedTaxes = new Map<number, SalesTax>();
    
    lineItems.forEach((item) => {
      if (item.salesTaxId) {
        const salesTax = salesTaxes?.find(tax => tax.id === item.salesTaxId);
        if (salesTax) {
          if (salesTax.isComposite) {
            const components = salesTaxes?.filter(tax => tax.parentId === salesTax.id) || [];
            
            if (components.length > 0) {
              components.forEach(component => {
                let componentTaxAmount: number;
                if (isExclusiveOfTax) {
                  componentTaxAmount = roundTo2Decimals((item.amount || 0) * (component.rate / 100));
                } else {
                  componentTaxAmount = roundTo2Decimals((item.amount || 0) - ((item.amount || 0) * 100) / (100 + component.rate));
                }
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
              
              usedTaxes.set(salesTax.id, salesTax);
            } else {
              let itemTaxAmount: number;
              if (isExclusiveOfTax) {
                itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
              } else {
                itemTaxAmount = roundTo2Decimals((item.amount || 0) - ((item.amount || 0) * 100) / (100 + salesTax.rate));
              }
              totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
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
              itemTaxAmount = roundTo2Decimals((item.amount || 0) * (salesTax.rate / 100));
            } else {
              itemTaxAmount = roundTo2Decimals((item.amount || 0) - ((item.amount || 0) * 100) / (100 + salesTax.rate));
            }
            totalTaxAmount = roundTo2Decimals(totalTaxAmount + itemTaxAmount);
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
      }
    });
    
    const finalTaxAmount = manualTaxOverride !== undefined 
      ? (manualTaxOverride === null ? totalTaxAmount : manualTaxOverride)
      : (manualTaxAmount !== null ? manualTaxAmount : totalTaxAmount);
    const total = isExclusiveOfTax ? roundTo2Decimals(subtotal + finalTaxAmount) : roundTo2Decimals(subtotal);
    
    const taxNameList = Array.from(usedTaxes.values()).map(tax => tax.name);
    const taxComponentsArray = Array.from(taxComponents.values());
    form.taxComponentsInfo = taxComponentsArray;
    
    setSubTotal(subtotal);
    setTaxAmount(finalTaxAmount);
    setTotalAmount(total);
    setTaxNames(taxNameList);
  };

  const updateLineItemAmount = (index: number) => {
    calculateTotals();
  };

  const handleComponentChange = (componentId: number, value: number) => {
    if (isNaN(value)) return;
    
    const roundedValue = roundTo2Decimals(value);
    setManualComponentAmounts(prev => ({
      ...prev,
      [componentId]: roundedValue
    }));
    
    // Sum all components to get new total
    const allComponents = form.taxComponentsInfo || [];
    const newTotal = allComponents.reduce((sum, comp) => {
      const amount = comp.id === componentId ? roundedValue : (manualComponentAmounts[comp.id] ?? comp.amount);
      return sum + amount;
    }, 0);
    
    setManualTaxAmount(roundTo2Decimals(newTotal));
    calculateTotals(roundTo2Decimals(newTotal));
  };

  useEffect(() => {
    calculateTotals();
  }, [fields.length, isExclusiveOfTax]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: Cheque) => {
    // Validate A/P and A/R account requirements
    const { hasAP, hasAR, accountsLoaded } = hasAccountsPayableOrReceivable(data.lineItems, accounts);
    
    if (!accountsLoaded) {
      toast({
        title: "Validation Error",
        description: "Account data is still loading. Please wait and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasAP || hasAR) {
      for (const item of data.lineItems) {
        const error = validateAccountContactRequirement(
          item.accountId,
          data.contactId,
          accounts,
          contacts
        );
        if (error) {
          toast({
            title: "Validation Error",
            description: error,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const enrichedData = {
      ...data,
      date: data.paymentDate || data.date,
      type: 'cheque' as const,
      status: 'completed' as const,
      amount: totalAmount,
      subTotal,
      taxAmount,
      balance: totalAmount,
      lineItems: data.lineItems.map(item => ({
        ...item,
        accountId: item.accountId || null,
        salesTaxId: item.salesTaxId || null,
      })),
      attachments: selectedFiles.length > 0 ? selectedFiles.map(f => f.name) : undefined
    };
    
    console.log("Submitting cheque data:", enrichedData);
    saveCheque.mutate(enrichedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payee</FormLabel>
                <div className="flex gap-2 items-center">
                  <FormControl>
                    <SearchableSelect
                      items={[{ value: "", label: "None", subtitle: undefined }, ...contactItems]}
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => {
                        if (value === "") {
                          field.onChange(undefined);
                        } else {
                          field.onChange(parseInt(value));
                        }
                      }}
                      placeholder="Select a payee"
                      emptyText={contactsLoading ? "Loading contacts..." : "No contacts found"}
                      searchPlaceholder="Search contacts..."
                      disabled={contactsLoading}
                      data-testid="select-payee"
                    />
                  </FormControl>
                  {field.value !== undefined && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => field.onChange(undefined)}
                      data-testid="button-clear-payee"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Account *</FormLabel>
                <SearchableSelect
                  items={bankAccountItems}
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  placeholder="Select payment account"
                  searchPlaceholder="Search accounts..."
                  emptyText={accountsLoading ? "Loading accounts..." : "No payment accounts available"}
                  disabled={accountsLoading}
                  onAddNew={() => {
                    setAccountDialogContext({type: 'payment'});
                    setShowAddAccountDialog(true);
                  }}
                  addNewText="Add New Account"
                  data-testid="select-bank-account"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        data-testid="button-payment-date"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <SearchableSelect
                  items={paymentMethodItems}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Select payment method"
                  searchPlaceholder="Search methods..."
                  emptyText="No payment methods found"
                  data-testid="select-payment-method"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ref No.</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-reference" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Line Items</h3>
          <div className="w-full flex justify-end mb-2">
            <div className="flex items-center">
              <span className="mr-2 text-sm text-muted-foreground">Amounts are</span>
              <Select
                value={isExclusiveOfTax ? "exclusive" : "inclusive"}
                onValueChange={(value) => setIsExclusiveOfTax(value === "exclusive")}
              >
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                  <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 grid grid-cols-[25%_35%_20%_20%_auto] gap-2 p-3 font-medium text-sm">
              <div>Account</div>
              <div>Description</div>
              <div>Amount</div>
              <div>Sales Tax</div>
              <div></div>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[25%_35%_20%_20%_auto] gap-2 p-3 border-t items-start">
                <div>
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <SearchableSelect
                          items={allAccountItems}
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          placeholder="Select account"
                          searchPlaceholder="Search accounts..."
                          emptyText={accountsLoading ? "Loading..." : "No accounts available"}
                          disabled={accountsLoading}
                          onAddNew={() => {
                            setAccountDialogContext({type: 'lineItem', index});
                            setShowAddAccountDialog(true);
                          }}
                          addNewText="Add New Account"
                          data-testid={`select-account-${index}`}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Description" {...field} data-testid={`input-description-${index}`} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
                  <FormField
                    control={form.control}
                    name={`lineItems.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            className="text-right"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              updateLineItemAmount(index);
                            }}
                            data-testid={`input-amount-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div>
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
                            }}
                            placeholder="None"
                            searchPlaceholder="Search taxes..."
                            emptyText={salesTaxesLoading ? "Loading..." : "No taxes found."}
                            data-testid={`select-tax-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex items-center justify-end">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => append({ accountId: undefined, description: '', amount: 0, salesTaxId: undefined })}
            data-testid="button-add-line-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Line Item
          </Button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Totals</h3>
          <div className="space-y-3 max-w-md ml-auto">
            <div className="flex justify-between items-center text-gray-700">
              <span className="text-sm font-medium">Subtotal</span>
              <span className="font-medium text-right">${formatCurrency(subTotal)}</span>
            </div>
            
            {/* Tax Section - show EITHER main input OR components */}
            {form.taxComponentsInfo && form.taxComponentsInfo.length > 0 ? (
              // COMPOSITE TAX: Show only editable components (no total line)
              <div className="space-y-1">
                {form.taxComponentsInfo.map((taxComponent: TaxComponentInfo) => (
                  <div key={taxComponent.id} className="flex justify-between items-center text-gray-700">
                    <span className="text-sm">
                      {taxComponent.name} ({taxComponent.rate}%)
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualComponentAmounts[taxComponent.id] !== undefined ? manualComponentAmounts[taxComponent.id].toFixed(2) : taxComponent.amount.toFixed(2)}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value)) {
                            handleComponentChange(taxComponent.id, value);
                          }
                        }}
                        className="w-24 h-8 text-right px-2 font-medium border-gray-300"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // SIMPLE TAX: Show only main tax input (no components)
              <div className="flex justify-between items-center text-gray-700">
                <span className="text-sm">
                  {taxNames.length > 0 ? taxNames.join(', ') : 'Tax'}
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
                        setManualComponentAmounts({});
                        calculateTotals(roundedValue);
                      } else {
                        setManualTaxAmount(null);
                        setManualComponentAmounts({});
                        calculateTotals(null);
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value.trim() === '') {
                        setManualTaxAmount(null);
                        setManualComponentAmounts({});
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
            )}
            
            <div className="flex justify-between border-t border-gray-300 pt-3">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="font-semibold text-gray-900 text-right">${formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="memo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Memo</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add notes or memo..." 
                  className="min-h-[80px]"
                  {...field} 
                  data-testid="textarea-memo"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border rounded-lg p-4">
          <FormLabel className="text-sm font-medium mb-3 block">Attachments</FormLabel>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('file-upload')?.click()}
                data-testid="button-upload"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              {selectedFiles.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </span>
              )}
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <span className="text-sm truncate flex-1" data-testid={`file-name-${index}`}>
                      {file.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(index)}
                      data-testid={`button-remove-file-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={saveCheque.isPending}
            data-testid="button-save"
          >
            {saveCheque.isPending ? 'Saving...' : isEditing ? 'Update Cheque' : 'Save Cheque'}
          </Button>
        </div>
      </form>

      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountCreated={(accountId) => {
          if (accountDialogContext?.type === 'payment') {
            form.setValue('paymentAccountId', accountId);
          } else if (accountDialogContext?.type === 'lineItem' && accountDialogContext.index !== undefined) {
            form.setValue(`lineItems.${accountDialogContext.index}.accountId`, accountId);
          }
          setAccountDialogContext(null);
        }}
      />
    </Form>
  );
}
