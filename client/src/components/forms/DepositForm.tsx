import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarIcon, X, Trash2, PlusCircle, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { apiRequest } from "@/lib/queryClient";
import { Account } from "@shared/schema";

// Define the deposit line item schema
const depositLineItemSchema = z.object({
  receivedFrom: z.string().optional(),
  accountId: z.number().optional(),
  description: z.string().optional(),
  paymentMethod: z.string().optional(),
  refNo: z.string().optional(),
  amount: z.number().min(0, "Amount must be a positive number").default(0),
  salesTaxId: z.number().optional(),
});

// Define the deposit schema
const depositSchema = z.object({
  depositAccountId: z.number({ required_error: "Please select a deposit account" }),
  date: z.date({ required_error: "Please select a date" }),
  lineItems: z.array(depositLineItemSchema).min(1, "At least one item is required"),
  memo: z.string().optional(),
  attachment: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositSchema>;

interface DepositFormProps {
  onSuccess?: () => void;
}

export default function DepositForm({ onSuccess }: DepositFormProps) {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isExclusiveOfTax, setIsExclusiveOfTax] = useState(true);

  // Fetch accounts for the dropdown
  const { data: accounts } = useQuery<Account[]>({
    queryKey: ['/api/accounts'],
  });

  // Filter bank and credit accounts
  const bankAccounts = accounts?.filter(account => 
    account.type === 'bank' || account.type === 'credit_card'
  ) || [];

  // Filter accounts for the line items (income accounts typically)
  const depositableAccounts = accounts?.filter(account => 
    account.type === 'income' || account.type === 'other_income'
  ) || [];
  
  // Initialize form with default values
  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      date: new Date(),
      lineItems: [
        {
          receivedFrom: '',
          accountId: undefined,
          description: '',
          paymentMethod: '',
          refNo: '',
          amount: 0,
          salesTaxId: undefined,
        }
      ],
      memo: '',
    },
  });

  // Create field array for line items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Calculate total
  const depositTotal = form.watch("lineItems").reduce(
    (sum, item) => sum + (item.amount || 0), 
    0
  );

  // Mutation for creating a new deposit
  const createDepositMutation = useMutation({
    mutationFn: async (data: DepositFormValues) => {
      return await apiRequest('/api/deposits', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Deposit has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ledger-entries'] });
      if (onSuccess) {
        onSuccess();
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create deposit: ${error}`,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: DepositFormValues) => {
    createDepositMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header with basic deposit info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="depositAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Account</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name} {account.code ? `(${account.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                          className="pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, "MMMM dd, yyyy")
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

            <div className="flex items-center justify-end space-x-2 mt-8">
              <div className="flex items-center">
                <span className="mr-2">Amounts are</span>
                <Select
                  value={isExclusiveOfTax ? "exclusive" : "inclusive"}
                  onValueChange={(value) => setIsExclusiveOfTax(value === "exclusive")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exclusive">Exclusive of Tax</SelectItem>
                    <SelectItem value="inclusive">Inclusive of Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-lg flex items-center">
                <span>Add funds to this deposit</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-t border-b">
                      <th className="w-10 px-4 py-3 text-left"></th>
                      <th className="px-4 py-3 text-left">RECEIVED FROM</th>
                      <th className="px-4 py-3 text-left">ACCOUNT</th>
                      <th className="px-4 py-3 text-left">DESCRIPTION</th>
                      <th className="px-4 py-3 text-left">PAYMENT METHOD</th>
                      <th className="px-4 py-3 text-left">REF NO.</th>
                      <th className="px-4 py-3 text-right">AMOUNT (CAD)</th>
                      <th className="px-4 py-3 text-left">SALES TAX</th>
                      <th className="w-10 px-4 py-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b">
                        <td className="px-4 py-3 text-center text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.receivedFrom`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Received from"
                                    className="border-0 focus-visible:ring-0 px-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.accountId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  value={field.value?.toString()}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {depositableAccounts.map((account) => (
                                      <SelectItem key={account.id} value={account.id.toString()}>
                                        {account.name} {account.code ? `(${account.code})` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Description"
                                    className="border-0 focus-visible:ring-0 px-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.paymentMethod`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  value={field.value?.toString()}
                                  onValueChange={(value) => field.onChange(value)}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="credit_card">Credit Card</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.refNo`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Reference #"
                                    className="border-0 focus-visible:ring-0 px-0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="border-0 focus-visible:ring-0 px-0 text-right"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.salesTaxId`}
                            render={({ field }) => (
                              <FormItem>
                                <Select
                                  value={field.value?.toString()}
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Tax rate" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="5">Exempt (0%)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={9} className="px-4 py-3">
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => append({
                                receivedFrom: '',
                                accountId: undefined,
                                description: '',
                                paymentMethod: '',
                                refNo: '',
                                amount: 0,
                                salesTaxId: undefined,
                              })}
                            >
                              Add Items
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                form.setValue("lineItems", [
                                  {
                                    receivedFrom: '',
                                    accountId: undefined,
                                    description: '',
                                    paymentMethod: '',
                                    refNo: '',
                                    amount: 0,
                                    salesTaxId: undefined,
                                  }
                                ]);
                              }}
                            >
                              Clear all lines
                            </Button>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">Other funds total</span>
                            <span className="ml-4 font-medium">
                              {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(depositTotal)}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <FormField
                control={form.control}
                name="memo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Memo</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Add any notes or details about this deposit" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div>
              <Label htmlFor="attachment">Attachment</Label>
              <div className="mt-2 flex items-center space-x-2">
                <Button type="button" variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Add Attachment</span>
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Attach receipts or other documents (PDF, JPG, PNG)
              </p>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div>
              <Button
                type="button"
                variant="outline"
                className="mr-2"
                onClick={() => setLocation("/dashboard")}
              >
                Cancel
              </Button>
            </div>
            <div className="space-x-2">
              <Button
                type="submit"
                disabled={createDepositMutation.isPending}
              >
                {createDepositMutation.isPending ? "Saving..." : "Save Deposit"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}