import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Account, Transaction } from "@shared/schema";
import { formatCurrency } from "@shared/utils";
import { AddAccountDialog } from "@/components/dialogs/AddAccountDialog";
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

  // Fetch all accounts
  const { data: allAccounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Filter for balance sheet accounts only (assets and liabilities)
  const balanceSheetAccounts = allAccounts.filter(acc => 
    acc.type === 'bank' ||
    acc.type === 'current_assets' ||
    acc.type === 'fixed_assets' ||
    acc.type === 'other_current_assets' ||
    acc.type === 'other_assets' ||
    acc.type === 'credit_card' ||
    acc.type === 'current_liabilities' ||
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
      if (onSuccess) onSuccess();
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From Account */}
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Account *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      items={accountItems}
                      value={field.value?.toString() || ''}
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      placeholder="Select account"
                      searchPlaceholder="Search accounts..."
                      emptyText="No accounts found."
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
                  <FormLabel>To Account *</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      items={accountItems}
                      value={field.value?.toString() || ''}
                      onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                      placeholder="Select account"
                      searchPlaceholder="Search accounts..."
                      emptyText="No accounts found."
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
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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

          {/* Memo */}
          <FormField
            control={form.control}
            name="memo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Memo / Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Optional note about this transfer..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    data-testid="textarea-memo"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
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
              disabled={createTransferMutation.isPending}
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
    </>
  );
}
