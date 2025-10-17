import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { JournalEntry, journalEntrySchema, Account, Contact, SalesTax } from "@shared/schema";
import { validateAccountContactRequirement, hasAccountsPayableOrReceivable } from "@/lib/accountValidation";
import { CalendarIcon, Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface JournalEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function JournalEntryForm({ onSuccess, onCancel }: JournalEntryFormProps) {
  const { toast } = useToast();
  
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: salesTaxes, isLoading: salesTaxesLoading } = useQuery<SalesTax[]>({
    queryKey: ['/api/sales-taxes'],
  });

  // Transform contacts into SearchableSelectItem format
  const contactItems: SearchableSelectItem[] = contacts?.map(contact => ({
    value: contact.id.toString(),
    label: contact.name,
    subtitle: `· ${contact.type}`
  })) || [];

  // Transform accounts into SearchableSelectItem format
  const accountItems: SearchableSelectItem[] = accounts?.map(account => ({
    value: account.id.toString(),
    label: `${account.code} - ${account.name}`,
    subtitle: undefined
  })) || [];

  // Transform sales taxes for SearchableSelect
  const taxItems: SearchableSelectItem[] = [
    { value: 'none', label: 'Exempt', subtitle: undefined },
    ...(salesTaxes?.map(tax => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    })) || [])
  ];

  const form = useForm<JournalEntry>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: new Date(),
      reference: `JE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
      description: '',
      attachments: '',
      entries: [
        { accountId: 0, contactId: undefined, description: '', debit: 0, credit: 0, salesTaxId: undefined },
        { accountId: 0, contactId: undefined, description: '', debit: 0, credit: 0, salesTaxId: undefined }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const createJournalEntry = useMutation({
    mutationFn: async (data: JournalEntry) => {
      return await apiRequest('/api/journal-entries', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      if (onSuccess) onSuccess();
    },
  });

  const calculateTotals = () => {
    const entries = form.getValues('entries');
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);
    
    return { totalDebits, totalCredits, difference: Math.abs(totalDebits - totalCredits) };
  };

  const onSubmit = (data: JournalEntry) => {
    // Validate A/P and A/R account requirements using per-line contactId
    const lineItems = data.entries.map(entry => ({
      accountId: entry.accountId
    }));
    
    const { hasAP, hasAR, accountsLoaded } = hasAccountsPayableOrReceivable(lineItems, accounts);
    
    if (!accountsLoaded) {
      toast({
        title: "Validation Error",
        description: "Account data is still loading. Please wait and try again.",
        variant: "destructive",
      });
      return;
    }
    
    if (hasAP || hasAR) {
      for (const entry of data.entries) {
        const error = validateAccountContactRequirement(
          entry.accountId,
          entry.contactId,
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

    createJournalEntry.mutate(data);
  };

  const { totalDebits, totalCredits, difference } = calculateTotals();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Journal Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="input-journal-date"
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

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="JE-YYYY-MM-DD" 
                      {...field} 
                      data-testid="input-journal-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Memo</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter journal entry memo..." 
                    {...field} 
                    rows={2}
                    data-testid="input-memo"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="attachments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attachments</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input 
                      placeholder="Enter attachment URLs or paths (comma-separated)" 
                      {...field} 
                      data-testid="input-attachments"
                    />
                    <Button type="button" variant="outline" size="icon">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Entry Table Section */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Journal Entries</h3>
            
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 mb-3 pb-2 border-b">
              <div className="col-span-3 text-sm font-medium text-gray-700">Account</div>
              <div className="col-span-2 text-sm font-medium text-gray-700">Name</div>
              <div className="col-span-2 text-sm font-medium text-gray-700">Description</div>
              <div className="col-span-2 text-sm font-medium text-gray-700">Debits</div>
              <div className="col-span-2 text-sm font-medium text-gray-700">Credits</div>
              <div className="col-span-1 text-sm font-medium text-gray-700">Tax</div>
            </div>
            
            {/* Entry Rows */}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-3 items-start">
                {/* Account */}
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <SearchableSelect
                            items={accountItems}
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            placeholder="Select account"
                            searchPlaceholder="Search accounts..."
                            emptyText={accountsLoading ? "Loading..." : "No accounts found."}
                            disabled={accountsLoading}
                            data-testid={`select-account-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Name (Contact) */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.contactId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <SearchableSelect
                            items={[{ value: "", label: "None", subtitle: undefined }, ...contactItems]}
                            value={field.value?.toString() || ""}
                            onValueChange={(value) => field.onChange(value === "" ? undefined : parseInt(value))}
                            placeholder="None"
                            emptyText={contactsLoading ? "Loading..." : "No contacts found"}
                            searchPlaceholder="Search contacts..."
                            disabled={contactsLoading}
                            data-testid={`select-name-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Description" 
                            {...field} 
                            data-testid={`input-description-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Debits */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.debit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              form.trigger('entries');
                            }}
                            data-testid={`input-debit-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Credits */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.credit`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              form.trigger('entries');
                            }}
                            data-testid={`input-credit-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Sales Tax */}
                <div className="col-span-1 flex items-center gap-1">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.salesTaxId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <SearchableSelect
                            items={taxItems}
                            value={field.value?.toString() || "none"}
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                            placeholder="-"
                            searchPlaceholder="Search taxes..."
                            emptyText={salesTaxesLoading ? "Loading..." : "No taxes found."}
                            data-testid={`select-tax-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Delete Button */}
                  {fields.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      data-testid={`button-delete-entry-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => append({ accountId: 0, contactId: undefined, description: '', debit: 0, credit: 0, salesTaxId: undefined })}
              data-testid="button-add-entry"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            
            {/* Totals Section */}
            <div className="flex justify-end gap-6 mt-6 pt-4 border-t text-sm">
              <div>
                <p className="text-gray-600">Total Debits:</p>
                <p className="font-bold text-lg" data-testid="text-total-debits">
                  ${totalDebits.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Credits:</p>
                <p className="font-bold text-lg" data-testid="text-total-credits">
                  ${totalCredits.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Difference:</p>
                <p className={cn(
                  "font-bold text-lg",
                  difference > 0.001 ? "text-red-500" : "text-green-600"
                )} data-testid="text-difference">
                  ${difference.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
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
              disabled={createJournalEntry.isPending || difference > 0.001}
              data-testid="button-save"
            >
              {createJournalEntry.isPending ? 'Saving...' : 'Save Journal Entry'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
