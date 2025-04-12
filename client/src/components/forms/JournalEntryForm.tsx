import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { JournalEntry, journalEntrySchema, Account } from "@shared/schema";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";

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
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  const form = useForm<JournalEntry>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: new Date(),
      reference: `JE-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}`,
      description: '',
      entries: [
        { accountId: 0, description: '', debit: 0, credit: 0 },
        { accountId: 0, description: '', debit: 0, credit: 0 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  const createJournalEntry = useMutation({
    mutationFn: async (data: JournalEntry) => {
      return await apiRequest('POST', '/api/journal-entries', data);
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
    createJournalEntry.mutate(data);
  };

  const { totalDebits, totalCredits, difference } = calculateTotals();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="JE-YYYY-MM" {...field} />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Journal entry description" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <h3 className="text-md font-medium mb-2">Journal Entries</h3>
            <div className="grid grid-cols-12 gap-2 mb-2">
              <div className="col-span-5">
                <label className="text-sm font-medium text-gray-700">Account</label>
              </div>
              <div className="col-span-3">
                <label className="text-sm font-medium text-gray-700">Description</label>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Debit</label>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Credit</label>
              </div>
            </div>
            
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-5">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accountsLoading ? (
                              <SelectItem value="loading" disabled>Loading accounts...</SelectItem>
                            ) : accounts && accounts.length > 0 ? (
                              accounts.map((account) => (
                                <SelectItem key={account.id} value={account.id.toString()}>
                                  {account.code} - {account.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>No accounts available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-3">
                  <FormField
                    control={form.control}
                    name={`entries.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              form.trigger('entries');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              form.trigger('entries');
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ accountId: 0, description: '', debit: 0, credit: 0 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            
            <div className="flex justify-end space-x-4 mt-4 text-sm">
              <div>
                <p>Total Debits: <span className="font-semibold">${totalDebits.toFixed(2)}</span></p>
              </div>
              <div>
                <p>Total Credits: <span className="font-semibold">${totalCredits.toFixed(2)}</span></p>
              </div>
              <div>
                <p>Difference: <span className={cn("font-semibold", difference > 0.001 ? "text-red-500" : "text-green-500")}>
                  ${difference.toFixed(2)}
                </span></p>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <div>
              <Button 
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </div>
            <div>
              <Button 
                type="submit"
                disabled={createJournalEntry.isPending || difference > 0.001}
              >
                {createJournalEntry.isPending ? 'Saving...' : 'Save Journal Entry'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
