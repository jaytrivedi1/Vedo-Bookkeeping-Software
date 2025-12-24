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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-categorize-transaction">
        <DialogHeader>
          <DialogTitle>Categorize Transaction</DialogTitle>
          <DialogDescription>
            Review AI suggestions and categorize this transaction
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{format(new Date(transaction.date), "MMM d, yyyy")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description:</span>
              <span className="font-medium">{transaction.name}</span>
            </div>
            {transaction.merchantName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant:</span>
                <span className="font-medium">{transaction.merchantName}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount:</span>
              <div className="flex items-center gap-2">
                {isDebit ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
                <span className={`font-semibold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                  ${displayAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Suggestions */}
        {loadingSuggestions ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Loading Suggestions...
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ) : smartSuggestion ? (
          <Card className={`border-l-4 ${
            smartSuggestion.source === 'pattern' ? 'border-l-green-500 bg-green-50' :
            smartSuggestion.source === 'rule' ? 'border-l-blue-500 bg-blue-50' :
            smartSuggestion.source === 'ai' ? 'border-l-purple-500 bg-purple-50' :
            'border-l-gray-300 bg-gray-50'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {smartSuggestion.source === 'pattern' && (
                    <>
                      <Brain className="h-4 w-4 text-green-600" />
                      <span>Learned Pattern</span>
                    </>
                  )}
                  {smartSuggestion.source === 'rule' && (
                    <>
                      <BookOpen className="h-4 w-4 text-blue-600" />
                      <span>Matched Rule</span>
                    </>
                  )}
                  {smartSuggestion.source === 'ai' && (
                    <>
                      <Wand2 className="h-4 w-4 text-purple-600" />
                      <span>AI Suggestion</span>
                    </>
                  )}
                  {smartSuggestion.source === 'none' && (
                    <>
                      <HelpCircle className="h-4 w-4 text-gray-500" />
                      <span>No Suggestion</span>
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge
                          variant={smartSuggestion.confidence >= 0.8 ? "default" : "secondary"}
                          className={
                            smartSuggestion.confidence >= 0.9 ? 'bg-green-600' :
                            smartSuggestion.confidence >= 0.8 ? 'bg-blue-600' :
                            smartSuggestion.confidence >= 0.7 ? 'bg-yellow-600' :
                            'bg-gray-500'
                          }
                        >
                          {Math.round(smartSuggestion.confidence * 100)}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Confidence score based on {
                          smartSuggestion.source === 'pattern' ? 'historical categorizations' :
                          smartSuggestion.source === 'rule' ? 'matching rule' :
                          'AI analysis'
                        }</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {smartSuggestion.requiresApproval && (
                    <Badge variant="outline" className="text-xs">
                      Needs Approval
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {smartSuggestion.transactionType && (
                <div>
                  <span className="text-muted-foreground">Suggested Type:</span>{" "}
                  <span className="font-medium">{getTypeLabel(smartSuggestion.transactionType as TransactionType)}</span>
                </div>
              )}
              {smartSuggestion.accountName && (
                <div>
                  <span className="text-muted-foreground">Suggested Account:</span>{" "}
                  <span className="font-medium">{smartSuggestion.accountName}</span>
                </div>
              )}
              {smartSuggestion.contactName && (
                <div>
                  <span className="text-muted-foreground">Suggested Contact:</span>{" "}
                  <span className="font-medium">{smartSuggestion.contactName}</span>
                </div>
              )}
              {smartSuggestion.reasoning && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground">Reasoning:</span>
                  <p className="mt-1 text-xs text-muted-foreground italic">{smartSuggestion.reasoning}</p>
                </div>
              )}
              {/* Apply Suggestion Button */}
              {smartSuggestion.accountId && (
                <div className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
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
                        description: "Review and confirm the suggested categorization",
                      });
                    }}
                    data-testid="button-apply-suggestion"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Apply Suggestion
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={categorizeMutation.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={categorizeMutation.isPending}
                data-testid="button-categorize"
              >
                {categorizeMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Categorize
              </Button>
            </div>
          </form>
        </Form>
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
