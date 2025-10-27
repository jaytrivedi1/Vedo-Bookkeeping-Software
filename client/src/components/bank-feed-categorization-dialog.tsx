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
import { Loader2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";

interface CategorizeTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ImportedTransaction | null;
}

type TransactionType = "expense" | "cheque" | "deposit" | "sales_receipt" | "transfer";

const formSchema = z.object({
  transactionType: z.enum(["expense", "cheque", "deposit", "sales_receipt", "transfer"]),
  accountId: z.number({ required_error: "Account is required" }),
  salesTaxId: z.number().nullable().optional(),
  memo: z.string().optional(),
  contactName: z.string().optional(),
  productId: z.number().nullable().optional(),
  transferAccountId: z.number().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AISuggestion {
  transactionType: TransactionType;
  accountId: number;
  accountName: string;
  contactName?: string;
  salesTaxId?: number;
  confidence: number;
  reasoning: string;
}

export default function CategorizeTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: CategorizeTransactionDialogProps) {
  const { toast } = useToast();
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedType, setSelectedType] = useState<TransactionType | null>(null);

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

  const taxItems: SearchableSelectItem[] = [
    { value: '0', label: 'None', subtitle: undefined },
    ...salesTaxes.map(tax => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined,
    })),
  ];

  const productItems: SearchableSelectItem[] = [
    { value: '0', label: 'None', subtitle: undefined },
    ...products.map(product => ({
      value: product.id.toString(),
      label: product.name,
      subtitle: product.sku ? `· ${product.sku}` : undefined,
    })),
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transactionType: undefined,
      accountId: undefined,
      salesTaxId: null,
      memo: "",
      contactName: "",
      productId: null,
      transferAccountId: null,
    },
  });

  // Fetch AI suggestions when dialog opens with a transaction
  useEffect(() => {
    if (open && transaction) {
      setLoadingSuggestions(true);
      apiRequest("/api/bank-feeds/categorization-suggestions", "POST", {
        transactionId: transaction.id,
      })
        .then((data) => {
          setAiSuggestions(data);
          // Auto-populate form with AI suggestions
          if (data) {
            form.setValue("transactionType", data.transactionType);
            form.setValue("accountId", data.accountId);
            if (data.contactName) form.setValue("contactName", data.contactName);
            if (data.salesTaxId) form.setValue("salesTaxId", data.salesTaxId);
            setSelectedType(data.transactionType);
          }
        })
        .catch((error) => {
          console.error("Failed to fetch AI suggestions:", error);
        })
        .finally(() => {
          setLoadingSuggestions(false);
        });
    } else if (!open) {
      // Reset when dialog closes
      setAiSuggestions(null);
      setSelectedType(null);
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

        {/* AI Suggestions */}
        {loadingSuggestions ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ) : aiSuggestions ? (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Suggestions
                </CardTitle>
                <Badge variant="secondary">
                  {Math.round(aiSuggestions.confidence * 100)}% confident
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Suggested Type:</span>{" "}
                <span className="font-medium">{getTypeLabel(aiSuggestions.transactionType)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Suggested Account:</span>{" "}
                <span className="font-medium">{aiSuggestions.accountName}</span>
              </div>
              {aiSuggestions.contactName && (
                <div>
                  <span className="text-muted-foreground">Suggested Contact:</span>{" "}
                  <span className="font-medium">{aiSuggestions.contactName}</span>
                </div>
              )}
              <div className="pt-2 border-t">
                <span className="text-muted-foreground">Reasoning:</span>
                <p className="mt-1 text-xs text-muted-foreground italic">{aiSuggestions.reasoning}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Categorization Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedType(value as TransactionType);
                      }}
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

            {/* Account (required for all types) */}
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax (required for all types) */}
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

            {/* Vendor (for Expense/Cheque) */}
            {selectedType && (selectedType === "expense" || selectedType === "cheque") && (
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
            )}

            {/* Customer (for Sales Receipt) */}
            {selectedType === "sales_receipt" && (
              <>
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
              </>
            )}

            {/* Transfer Account (for Transfer) */}
            {selectedType === "transfer" && (
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
    </Dialog>
  );
}
