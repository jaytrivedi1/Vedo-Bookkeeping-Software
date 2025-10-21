import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { insertAccountSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated?: (accountId: number) => void;
}

export function AddAccountDialog({ open, onOpenChange, onAccountCreated }: AddAccountDialogProps) {
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertAccountSchema),
    defaultValues: {
      code: "",
      name: "",
      type: "current_assets" as const,
      currency: "CAD",
      salesTaxType: "",
      isActive: true,
    },
  });

  // Log form errors for debugging
  const onError = (errors: any) => {
    console.error("Form validation errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check all required fields are filled correctly.",
      variant: "destructive",
    });
  };

  const createAccount = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/accounts', data);
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reports/account-balances'] });
      onOpenChange(false);
      form.reset();
      toast({
        title: "Account created",
        description: "The account has been created successfully.",
      });
      
      // Call the callback with the new account ID if provided
      if (onAccountCreated && response?.id) {
        onAccountCreated(response.id);
      }
    },
  });

  const onSubmit = (data: any) => {
    // Convert "none" to empty string for salesTaxType
    if (data.salesTaxType === "none") {
      data.salesTaxType = "";
    }
    createAccount.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Create a new account in your Chart of Accounts
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="1000" data-testid="input-account-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cash" data-testid="input-account-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-account-type">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Assets</SelectLabel>
                        <SelectItem value="accounts_receivable">Accounts Receivable</SelectItem>
                        <SelectItem value="current_assets">Current Assets</SelectItem>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="property_plant_equipment">Property, Plant & Equipment</SelectItem>
                        <SelectItem value="long_term_assets">Long-term Assets</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Liabilities</SelectLabel>
                        <SelectItem value="accounts_payable">Accounts Payable</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="other_current_liabilities">Other Current Liabilities</SelectItem>
                        <SelectItem value="long_term_liabilities">Long-term Liabilities</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Equity</SelectLabel>
                        <SelectItem value="equity">Equity</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Income</SelectLabel>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="other_income">Other Income</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Expenses</SelectLabel>
                        <SelectItem value="cost_of_goods_sold">Cost of Goods Sold</SelectItem>
                        <SelectItem value="expenses">Expenses</SelectItem>
                        <SelectItem value="other_expense">Other Expense</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-currency">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salesTaxType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Tax Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-sales-tax-type">
                          <SelectValue placeholder="Select tax type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="GST">GST</SelectItem>
                        <SelectItem value="QST">QST</SelectItem>
                        <SelectItem value="HST">HST</SelectItem>
                        <SelectItem value="PST">PST</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-is-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createAccount.isPending}
                data-testid="button-create-account"
              >
                {createAccount.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
