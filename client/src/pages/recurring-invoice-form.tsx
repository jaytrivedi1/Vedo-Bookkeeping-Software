import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Trash2, Plus, Loader2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { Contact, SalesTax, RecurringTemplate, RecurringLine } from "@shared/schema";

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  amount: z.number().min(0),
  accountId: z.number().optional(),
  salesTaxId: z.number().optional(),
  productId: z.number().optional(),
});

const recurringFormSchema = z.object({
  customerId: z.number({ message: "Customer is required" }),
  templateName: z.string().min(1, "Template name is required"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  dayOfMonth: z.number().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  maxOccurrences: z.number().optional(),
  autoEmail: z.boolean().default(false),
  autoCharge: z.boolean().default(false),
  paymentTerms: z.string().optional(),
  memo: z.string().optional(),
  lines: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type RecurringFormValues = z.infer<typeof recurringFormSchema>;

export default function RecurringInvoiceFormPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<typeof lineItemSchema._type[]>([
    { description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  const { data: customers = [] } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
  });

  const { data: taxes = [] } = useQuery<SalesTax[]>({
    queryKey: ["/api/sales-taxes"],
  });

  const { data: template, isLoading } = useQuery<RecurringTemplate>({
    queryKey: id ? [`/api/recurring/${id}`] : [],
    enabled: !!id,
  });

  const { data: templateLines = [] } = useQuery<RecurringLine[]>({
    queryKey: id ? [`/api/recurring/${id}/lines`] : [],
    enabled: !!id,
  });

  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: {
      customerId: undefined,
      templateName: "",
      frequency: "monthly",
      dayOfMonth: 1,
      startDate: format(new Date(), "yyyy-MM-dd"),
      autoEmail: false,
      autoCharge: false,
      paymentTerms: "Net 30",
      memo: "",
      lines: lineItems,
    },
  });

  useEffect(() => {
    if (template && templateLines.length > 0) {
      form.reset({
        customerId: template.customerId,
        templateName: template.templateName,
        frequency: template.frequency,
        dayOfMonth: template.dayOfMonth || undefined,
        startDate: format(new Date(template.startDate), "yyyy-MM-dd"),
        endDate: template.endDate ? format(new Date(template.endDate), "yyyy-MM-dd") : "",
        maxOccurrences: template.maxOccurrences || undefined,
        autoEmail: template.autoEmail,
        autoCharge: template.autoCharge,
        paymentTerms: template.paymentTerms || "",
        memo: template.memo || "",
        lines: templateLines,
      });
      setLineItems(templateLines);
    }
  }, [template, templateLines]);

  const createMutation = useMutation({
    mutationFn: (data: RecurringFormValues) => apiRequest("POST", "/api/recurring", data),
    onSuccess: () => {
      toast({ title: "Template created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      navigate("/recurring-invoices");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RecurringFormValues) => apiRequest("PUT", `/api/recurring/${id}`, data),
    onSuccess: () => {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      navigate("/recurring-invoices");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const calculateLineAmount = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newItems = [...lineItems];
    const item = newItems[index];

    if (field === "quantity" || field === "unitPrice") {
      item[field as keyof typeof item] = value;
      item.amount = calculateLineAmount(item.quantity || 0, item.unitPrice || 0);
    } else {
      item[field as keyof typeof item] = value;
    }

    setLineItems(newItems);
    form.setValue("lines", newItems);
  };

  const addLineItem = () => {
    const newItems = [
      ...lineItems,
      { description: "", quantity: 1, unitPrice: 0, amount: 0 },
    ];
    setLineItems(newItems);
    form.setValue("lines", newItems);
  };

  const removeLineItem = (index: number) => {
    const newItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newItems);
    form.setValue("lines", newItems);
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = 0; // TODO: calculate based on selected tax rates

  const onSubmit = (data: RecurringFormValues) => {
    data.lines = lineItems;
    
    if (id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  if (id && isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate("/recurring-invoices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">{id ? "Edit" : "Create"} Recurring Invoice</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(v) => field.onChange(parseInt(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
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
              name="templateName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Monthly Service Invoice" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxOccurrences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Occurrences (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Leave blank for unlimited"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Net 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="memo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Memo</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
            <FormField
              control={form.control}
              name="autoEmail"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Auto-email invoices to customer</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoCharge"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="!mt-0 cursor-pointer">Auto-charge payment method on due date</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {/* Line Items Section */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Quantity</TableHead>
                    <TableHead className="w-24">Unit Price</TableHead>
                    <TableHead className="w-24">Amount</TableHead>
                    <TableHead className="w-24">Tax</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          placeholder="Description"
                          value={item.description}
                          onChange={(e) => updateLineItem(index, "description", e.target.value)}
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, "unitPrice", parseFloat(e.target.value))}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        ${item.amount?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.salesTaxId?.toString() || "none"}
                          onValueChange={(v) => updateLineItem(index, "salesTaxId", v !== "none" ? parseInt(v) : undefined)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {taxes.map((tax) => (
                              <SelectItem key={tax.id} value={tax.id.toString()}>
                                {tax.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button type="button" variant="outline" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
              </Button>

              <div className="border-t pt-4 space-y-2 text-right max-w-xs ml-auto">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${(subtotal + taxAmount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/recurring-invoices")}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {id ? "Update" : "Create"} Template
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
