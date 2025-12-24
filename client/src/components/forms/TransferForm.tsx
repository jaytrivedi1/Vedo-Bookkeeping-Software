import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Account, Transaction } from "@shared/schema";
import { formatCurrency } from "@shared/utils";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
import { ExchangeRateInput } from "@/components/ui/exchange-rate-input";
import { ExchangeRateUpdateDialog } from "@/components/dialogs/ExchangeRateUpdateDialog";
import { CalendarIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const transferFormSchema = z.object({
  fromAccountId: z.number({ required_error: "From account is required" }),
  toAccountId: z.number({ required_error: "To account is required" }),
  amount: z.number().positive("Amount must be greater than 0"),
  date: z.date(),
  memo: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "From and To accounts must be different",
  path: ["toAccountId"],
});

type TransferFormData = z.infer<typeof transferFormSchema>;

interface TransferFormProps {
  transfer?: Transaction;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function TransferForm({ transfer, onSuccess, onCancel }: TransferFormProps) {
  const isEditing = Boolean(transfer);
  const { toast } = useToast();
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  const [accountDialogContext, setAccountDialogContext] = useState<'from' | 'to' | null>(null);
  const [showExchangeRateDialog, setShowExchangeRateDialog] = useState(false);
  const [pendingExchangeRate, setPendingExchangeRate] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(transfer?.exchangeRate ? parseFloat(transfer.exchangeRate) : 1);

  // Fetch all accounts
  const { data: allAccounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Fetch preferences for multi-currency settings
  const { data: preferences } = useQuery<any>({
    queryKey: ['/api/preferences'],
  });

  // Get home currency from preferences
  const homeCurrency = preferences?.homeCurrency || 'USD';
  const isMultiCurrencyEnabled = preferences?.multiCurrencyEnabled || false;

  // Filter for balance sheet accounts only (assets and liabilities)
  const balanceSheetAccounts = allAccounts.filter(acc => 
    acc.type === 'bank' ||
    acc.type === 'current_assets' ||
    acc.type === 'property_plant_equipment' ||
    acc.type === 'long_term_assets' ||
    acc.type === 'credit_card' ||
    acc.type === 'other_current_liabilities' ||
    acc.type === 'long_term_liabilities'
  );

  // Transform accounts for SearchableSelect
  const accountItems: SearchableSelectItem[] = balanceSheetAccounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.code} - ${acc.name}`,
    subtitle: acc.balance !== undefined ? `· Balance: ${formatCurrency(acc.balance)}` : undefined
  }));

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: {
      fromAccountId: undefined,
      toAccountId: undefined,
      amount: 0,
      date: new Date(),
      memo: "",
    },
  });

  // Watch for account changes to detect foreign currency
  const fromAccountId = form.watch("fromAccountId");
  const toAccountId = form.watch("toAccountId");
  const transferDate = form.watch("date") || new Date();

  // Detect foreign currency from either account
  const fromAccount = allAccounts.find(acc => acc.id === fromAccountId);
  const toAccount = allAccounts.find(acc => acc.id === toAccountId);
  
  const foreignCurrencyAccount = fromAccount?.currency !== homeCurrency ? fromAccount : 
                                  toAccount?.currency !== homeCurrency ? toAccount : null;
  const foreignCurrency = foreignCurrencyAccount?.currency || homeCurrency;
  const hasForeignCurrency = isMultiCurrencyEnabled && foreignCurrency !== homeCurrency;

  // Fetch exchange rate when foreign currency is detected
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery<any>({
    queryKey: ['/api/exchange-rates/rate', { fromCurrency: foreignCurrency, toCurrency: homeCurrency, date: transferDate }],
    enabled: hasForeignCurrency,
    queryFn: async () => {
      const response = await fetch(
        `/api/exchange-rates/rate?fromCurrency=${foreignCurrency}&toCurrency=${homeCurrency}&date=${format(transferDate, 'yyyy-MM-dd')}`
      );
      if (!response.ok) {
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
    } else if (!hasForeignCurrency) {
      setExchangeRate(1);
    }
  }, [exchangeRateData, hasForeignCurrency]);

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
        await apiRequest('/api/exchange-rates', 'PUT', {
          fromCurrency: foreignCurrency,
          toCurrency: homeCurrency,
          rate: pendingExchangeRate,
          date: format(transferDate, 'yyyy-MM-dd'),
          scope: 'all_on_date'
        });
        
        setExchangeRate(pendingExchangeRate);
        
        // Invalidate exchange rates cache
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates/rate'] });
        
        toast({
          title: "Exchange rate updated",
          description: `The rate has been updated for all ${foreignCurrency} transactions on ${format(transferDate, 'dd/MM/yyyy')}.`,
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

  const createTransferMutation = useMutation({
    mutationFn: async (data: TransferFormData) => {
      return await apiRequest('/api/transfers', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      toast({
        title: "Success",
        description: "Transfer recorded successfully",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        window.history.back();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transfer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate(data);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Transfer Details Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Transfer Details</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From Account */}
                <FormField
                  control={form.control}
                  name="fromAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">From Account *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={accountItems}
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                          placeholder="Select account"
                          searchPlaceholder="Search accounts..."
                          emptyText="No accounts found."
                          className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                          data-testid="select-from-account"
                          onAddNew={() => {
                            setAccountDialogContext('from');
                            setShowAddAccountDialog(true);
                          }}
                          addNewText="Add New Account"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* To Account */}
                <FormField
                  control={form.control}
                  name="toAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">To Account *</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={accountItems}
                          value={field.value?.toString() || ''}
                          onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                          placeholder="Select account"
                          searchPlaceholder="Search accounts..."
                          emptyText="No accounts found."
                          className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                          data-testid="select-to-account"
                          onAddNew={() => {
                            setAccountDialogContext('to');
                            setShowAddAccountDialog(true);
                          }}
                          addNewText="Add New Account"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          className="bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                          data-testid="input-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal bg-slate-50 border-slate-200 h-11 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-date"
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
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Exchange Rate Section - Show when foreign currency is detected */}
          {hasForeignCurrency && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 bg-blue-50">
                <ExchangeRateInput
                  fromCurrency={foreignCurrency}
                  toCurrency={homeCurrency}
                  value={exchangeRate}
                  onChange={handleExchangeRateChange}
                  isLoading={exchangeRateLoading}
                  date={transferDate}
                />
              </div>
            </div>
          )}

          {/* Additional Information Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Additional Information</h3>
            </div>
            <div className="p-6">
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">Memo / Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional note about this transfer..."
                        className="resize-none bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl"
                        rows={3}
                        {...field}
                        data-testid="textarea-memo"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl px-6"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTransferMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 rounded-xl px-6"
              data-testid="button-submit"
            >
              {createTransferMutation.isPending ? "Saving..." : "Save Transfer"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onAccountCreated={(accountId) => {
          if (accountDialogContext === 'from') {
            form.setValue('fromAccountId', accountId);
          } else if (accountDialogContext === 'to') {
            form.setValue('toAccountId', accountId);
          }
          setAccountDialogContext(null);
        }}
      />

      {/* Exchange Rate Update Dialog */}
      <ExchangeRateUpdateDialog
        open={showExchangeRateDialog}
        onOpenChange={setShowExchangeRateDialog}
        fromCurrency={foreignCurrency}
        toCurrency={homeCurrency}
        oldRate={exchangeRate}
        newRate={pendingExchangeRate || exchangeRate}
        date={transferDate}
        onConfirm={handleExchangeRateUpdate}
      />
    </>
  );
}
