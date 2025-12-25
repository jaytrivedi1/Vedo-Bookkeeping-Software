import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ImportedTransaction, Account, Contact, SalesTax, Product } from "@shared/schema";
import { format } from "date-fns";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Brain, BookOpen, Wand2, HelpCircle } from "lucide-react";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategorizeTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ImportedTransaction | null;
}

type TransactionType = "expense" | "cheque" | "deposit" | "sales_receipt" | "transfer";

const formSchema = z.object({
  transactionType: z.enum(["expense", "cheque", "deposit", "sales_receipt", "transfer"]),
  accountId: z.number({ required_error: "Account is required" }).optional(),
  salesTaxId: z.number().nullable().optional(),
  memo: z.string().optional(),
  contactName: z.string().optional(),
  productId: z.number().nullable().optional(),
  transferAccountId: z.number().nullable().optional(),
}).refine(
  (data) => {
    // For non-transfer transactions, accountId is required
    if (data.transactionType !== "transfer") {
      return data.accountId !== undefined;
    }
    return true;
  },
  {
    message: "Account is required",
    path: ["accountId"],
  }
);

type FormValues = z.infer<typeof formSchema>;

type SuggestionSource = 'pattern' | 'rule' | 'ai' | 'none';

interface SmartSuggestion {
  source: SuggestionSource;
  confidence: number;
  transactionType?: string;
  accountId?: number;
  accountName?: string;
  contactId?: number;
  contactName?: string;
  salesTaxId?: number;
  reasoning?: string;
  requiresApproval: boolean;
  ruleId?: number;
  patternId?: number;
}

export default function CategorizeTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: CategorizeTransactionDialogProps) {
  const { toast } = useToast();
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSuggestion | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accountFieldContext, setAccountFieldContext] = useState<'account' | 'transfer'>('account');

  // Fetch all GL accounts
  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
    enabled: open,
  });

  // Fetch contacts
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

  // Fetch sales taxes
  const { data: salesTaxes = [] } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
    select: (data: SalesTax[]) => data.filter(tax => !tax.parentId),
    enabled: open,
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: open,
  });

  // Transform data for SearchableSelect
  const accountItems: SearchableSelectItem[] = accounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: undefined,
  }));

  const contactItems: SearchableSelectItem[] = contacts.map(contact => ({
    value: contact.name,
    label: contact.name,
    subtitle: `· ${contact.type}`,
  }));

  const taxItems: SearchableSelectItem[] = salesTaxes.map(tax => ({
    value: tax.id.toString(),
    label: tax.name,
    subtitle: tax.rate ? `· ${tax.rate}%` : undefined,
  }));

  const productItems: SearchableSelectItem[] = [
    { value: '0', label: 'None', subtitle: undefined },
    ...products.map(product => ({
      value: product.id.toString(),
      label: product.name,
      subtitle: product.sku ? `· ${product.sku}` : undefined,
    })),
  ];

  // Determine default transaction type based on amount
  const getDefaultTransactionType = (): TransactionType | undefined => {
    if (!transaction) return undefined;
    // Negative amount = money going out = expense
    // Positive amount = money coming in = deposit
    return transaction.amount < 0 ? "expense" : "deposit";
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: getDefaultTransactionType(),
      accountId: undefined,
      salesTaxId: null,
      memo: "",
      contactName: "",
      productId: null,
      transferAccountId: null,
    },
  });

  // Watch the transaction type directly - no need for separate state
  const selectedType = form.watch("transactionType");

  // Fetch smart suggestions when dialog opens with a transaction
  useEffect(() => {
    if (open && transaction) {
      // Reset form with intelligent defaults based on transaction amount
      form.reset({
        transactionType: transaction.amount < 0 ? "expense" : "deposit",
        accountId: undefined,
        salesTaxId: null,
        memo: "",
        contactName: "",
        productId: null,
        transferAccountId: null,
      });

      setLoadingSuggestions(true);
      // First try the new smart suggestion endpoint
      apiRequest("/api/bank-feeds/smart-suggestion", "POST", {
        transactionId: transaction.id,
      })
        .then((data) => {
          if (data && data.source !== 'none') {
            setSmartSuggestion(data as SmartSuggestion);
          } else {
            // Fallback to old endpoint if no smart suggestion
            return apiRequest("/api/bank-feeds/categorization-suggestions", "POST", {
              transactionId: transaction.id,
            }).then((fallbackData) => {
              const suggestions = fallbackData?.suggestions;
              if (suggestions) {
                const transformed: SmartSuggestion = {
                  source: 'ai',
                  transactionType: suggestions.transactionType || (transaction.amount < 0 ? "expense" : "deposit"),
                  accountId: suggestions.account?.id || 0,
                  accountName: suggestions.account?.name || "Unknown Account",
                  contactName: suggestions.contact?.name,
                  salesTaxId: suggestions.tax?.id,
                  confidence: suggestions.confidence === 'High' ? 0.9 : suggestions.confidence === 'Medium' ? 0.7 : 0.5,
                  reasoning: suggestions.reasoning || "No reasoning provided",
                  requiresApproval: true,
                };
                setSmartSuggestion(transformed);
              }
            });
          }
        })
        .catch((error) => {
          console.error("Failed to fetch suggestions:", error);
          // Try fallback on error
          apiRequest("/api/bank-feeds/categorization-suggestions", "POST", {
            transactionId: transaction.id,
          })
            .then((fallbackData) => {
              const suggestions = fallbackData?.suggestions;
              if (suggestions) {
                const transformed: SmartSuggestion = {
                  source: 'ai',
                  transactionType: suggestions.transactionType || (transaction.amount < 0 ? "expense" : "deposit"),
                  accountId: suggestions.account?.id || 0,
                  accountName: suggestions.account?.name || "Unknown Account",
                  contactName: suggestions.contact?.name,
                  salesTaxId: suggestions.tax?.id,
                  confidence: suggestions.confidence === 'High' ? 0.9 : suggestions.confidence === 'Medium' ? 0.7 : 0.5,
                  reasoning: suggestions.reasoning || "No reasoning provided",
                  requiresApproval: true,
                };
                setSmartSuggestion(transformed);
              }
            })
            .catch(() => {
              // Silent fail - no suggestions available
            });
        })
        .finally(() => {
          setLoadingSuggestions(false);
        });
    } else if (!open) {
      // Reset when dialog closes
      setSmartSuggestion(null);
      form.reset();
    }
  }, [open, transaction]);

  // Categorize mutation
  const categorizeMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!transaction) throw new Error("No transaction selected");
      
      return await apiRequest(`/api/plaid/categorize-transaction/${transaction.id}`, "POST", {
        transactionType: values.transactionType,
        accountId: values.accountId,
        contactName: values.contactName || undefined,
        salesTaxId: values.salesTaxId || undefined,
        productId: values.productId || undefined,
        transferAccountId: values.transferAccountId || undefined,
        memo: values.memo || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/imported-transactions/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Transaction categorized successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to categorize transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    categorizeMutation.mutate(values);
  };

  // Get available transaction types based on amount
  const getAvailableTypes = (): TransactionType[] => {
    if (!transaction) return [];
    
    if (transaction.amount < 0) {
      // Debit (money out)
      return ["expense", "cheque", "transfer"];
    } else {
      // Credit (money in)
      return ["deposit", "sales_receipt", "transfer"];
    }
  };

  const availableTypes = getAvailableTypes();

  // Get transaction type label
  const getTypeLabel = (type: TransactionType): string => {
    const labels: Record<TransactionType, string> = {
      expense: "Expense",
      cheque: "Cheque",
      deposit: "Deposit",
      sales_receipt: "Sales Receipt",
      transfer: "Transfer",
    };
    return labels[type];
  };

  if (!transaction) return null;

  const isDebit = transaction.amount < 0;
  const displayAmount = Math.abs(transaction.amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0" data-testid="dialog-categorize-transaction">
        {/* Modern Header with Transaction Summary */}
        <div className={`px-6 py-4 border-b ${isDebit ? 'bg-gradient-to-r from-rose-50 to-white' : 'bg-gradient-to-r from-emerald-50 to-white'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Categorize Transaction
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mt-0.5">
                {transaction.name}
              </DialogDescription>
            </div>
            <div className={`text-right ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
              <div className="flex items-center gap-2 justify-end">
                {isDebit ? (
                  <TrendingDown className="h-5 w-5" />
                ) : (
                  <TrendingUp className="h-5 w-5" />
                )}
                <span className="text-2xl font-bold">
                  ${displayAmount.toFixed(2)}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {format(new Date(transaction.date), "MMM d, yyyy")}
                {transaction.merchantName && ` • ${transaction.merchantName}`}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">

        {/* Smart Suggestions */}
        {loadingSuggestions ? (
          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-slate-200 animate-pulse"></div>
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : smartSuggestion ? (
          <div className={`rounded-xl border-2 overflow-hidden transition-all ${
            smartSuggestion.source === 'pattern' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' :
            smartSuggestion.source === 'rule' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' :
            smartSuggestion.source === 'ai' ? 'border-violet-200 bg-gradient-to-br from-violet-50 to-white' :
            'border-slate-200 bg-gradient-to-br from-slate-50 to-white'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    smartSuggestion.source === 'pattern' ? 'bg-emerald-100' :
                    smartSuggestion.source === 'rule' ? 'bg-blue-100' :
                    smartSuggestion.source === 'ai' ? 'bg-violet-100' :
                    'bg-slate-100'
                  }`}>
                    {smartSuggestion.source === 'pattern' && <Brain className="h-5 w-5 text-emerald-600" />}
                    {smartSuggestion.source === 'rule' && <BookOpen className="h-5 w-5 text-blue-600" />}
                    {smartSuggestion.source === 'ai' && <Wand2 className="h-5 w-5 text-violet-600" />}
                    {smartSuggestion.source === 'none' && <HelpCircle className="h-5 w-5 text-slate-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {smartSuggestion.source === 'pattern' && 'Learned Pattern'}
                      {smartSuggestion.source === 'rule' && 'Matched Rule'}
                      {smartSuggestion.source === 'ai' && 'AI Suggestion'}
                      {smartSuggestion.source === 'none' && 'No Suggestion'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {smartSuggestion.source === 'pattern' && 'Based on your previous categorizations'}
                      {smartSuggestion.source === 'rule' && 'Matched an existing rule'}
                      {smartSuggestion.source === 'ai' && 'Intelligent recommendation'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={`font-semibold ${
                          smartSuggestion.confidence >= 0.9 ? 'bg-emerald-500 hover:bg-emerald-600' :
                          smartSuggestion.confidence >= 0.8 ? 'bg-blue-500 hover:bg-blue-600' :
                          smartSuggestion.confidence >= 0.7 ? 'bg-amber-500 hover:bg-amber-600' :
                          'bg-slate-500 hover:bg-slate-600'
                        }`}>
                          {Math.round(smartSuggestion.confidence * 100)}% match
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Confidence based on {
                          smartSuggestion.source === 'pattern' ? 'historical categorizations' :
                          smartSuggestion.source === 'rule' ? 'rule matching' :
                          'AI analysis'
                        }</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Suggestion Details */}
              <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                {smartSuggestion.transactionType && (
                  <div className="bg-white/60 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Type</p>
                    <p className="font-semibold text-gray-800">{getTypeLabel(smartSuggestion.transactionType as TransactionType)}</p>
                  </div>
                )}
                {smartSuggestion.accountName && (
                  <div className="bg-white/60 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Account</p>
                    <p className="font-semibold text-gray-800 truncate">{smartSuggestion.accountName}</p>
                  </div>
                )}
                {smartSuggestion.contactName && (
                  <div className="bg-white/60 rounded-lg p-2 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Contact</p>
                    <p className="font-semibold text-gray-800 truncate">{smartSuggestion.contactName}</p>
                  </div>
                )}
              </div>

              {smartSuggestion.reasoning && (
                <p className="text-xs text-gray-500 italic border-t border-slate-100 pt-2 mb-3">
                  💡 {smartSuggestion.reasoning}
                </p>
              )}

              {/* Apply Suggestion Button */}
              {smartSuggestion.accountId && (
                <Button
                  type="button"
                  className={`w-full transition-all ${
                    smartSuggestion.source === 'pattern' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' :
                    smartSuggestion.source === 'rule' ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' :
                    'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700'
                  }`}
                  onClick={() => {
                    if (smartSuggestion.transactionType) {
                      form.setValue("transactionType", smartSuggestion.transactionType as TransactionType);
                    }
                    if (smartSuggestion.accountId) {
                      form.setValue("accountId", smartSuggestion.accountId);
                    }
                    if (smartSuggestion.contactName) {
                      form.setValue("contactName", smartSuggestion.contactName);
                    }
                    if (smartSuggestion.salesTaxId) {
                      form.setValue("salesTaxId", smartSuggestion.salesTaxId);
                    }
                    toast({
                      title: "Suggestion Applied",
                      description: "Review and confirm the categorization below",
                    });
                  }}
                  data-testid="button-apply-suggestion"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Apply This Suggestion
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* Categorization Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Transaction Type - Always Shown */}
            {selectedType === "transfer" ? (
              <FormField
                control={form.control}
                name="transactionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Type *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        data-testid="select-transaction-type"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transaction type" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {getTypeLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Transaction Type */}
                <FormField
                  control={form.control}
                  name="transactionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction Type *</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          data-testid="select-transaction-type"
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {getTypeLabel(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Account (hidden for transfer) */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          items={accountItems}
                          placeholder="Select account"
                          emptyText="No accounts found"
                          data-testid="select-account"
                          onAddNew={() => {
                            setAccountFieldContext('account');
                            setAddAccountOpen(true);
                          }}
                          addNewText="Add New Account"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax (hidden for transfer) */}
                <FormField
                  control={form.control}
                  name="salesTaxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value?.toString() || "0"}
                          onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                          items={taxItems}
                          placeholder="Select tax"
                          emptyText="No taxes found"
                          data-testid="select-tax"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Conditional Fields - Keep mounted but use display:none to preserve values */}
            <div style={{ display: (selectedType === "expense" || selectedType === "cheque") ? "block" : "none" }}>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          items={contactItems.filter(c => c.subtitle?.includes('vendor'))}
                          placeholder="Select vendor"
                          emptyText="No vendors found"
                          data-testid="select-vendor"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div style={{ display: selectedType === "deposit" ? "block" : "none" }}>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          items={contactItems.filter(c => c.subtitle?.includes('customer'))}
                          placeholder="Select customer"
                          emptyText="No customers found"
                          data-testid="select-customer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div style={{ display: selectedType === "sales_receipt" ? "block" : "none" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          items={contactItems.filter(c => c.subtitle?.includes('customer'))}
                          placeholder="Select customer"
                          emptyText="No customers found"
                          data-testid="select-customer"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product/Service</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value?.toString() || "0"}
                          onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))}
                          items={productItems}
                          placeholder="Select product/service"
                          emptyText="No products found"
                          data-testid="select-product"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div style={{ display: selectedType === "transfer" ? "block" : "none" }}>
              <div className="grid grid-cols-1">
                <FormField
                  control={form.control}
                  name="transferAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isDebit ? "To Account" : "From Account"}</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value?.toString() || ""}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          items={accountItems}
                          placeholder={`Select ${isDebit ? 'destination' : 'source'} account`}
                          emptyText="No accounts found"
                          data-testid="select-transfer-account"
                          onAddNew={() => {
                            setAccountFieldContext('transfer');
                            setAddAccountOpen(true);
                          }}
                          addNewText="Add New Account"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Memo (for all types) */}
            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memo</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add notes or memo"
                      rows={2}
                      data-testid="input-memo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={categorizeMutation.isPending}
                className="px-6"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={categorizeMutation.isPending}
                className="px-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                data-testid="button-categorize"
              >
                {categorizeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Categorize Transaction
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>
      
      <AddAccountDialog
        open={addAccountOpen}
        onOpenChange={setAddAccountOpen}
        onAccountCreated={(accountId) => {
          if (accountFieldContext === 'account') {
            form.setValue("accountId", accountId);
          } else {
            form.setValue("transferAccountId", accountId);
          }
        }}
      />
    </Dialog>
  );
}
