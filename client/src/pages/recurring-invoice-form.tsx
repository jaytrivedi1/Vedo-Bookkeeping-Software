import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const recurringFormSchema = z.object({
  customerId: z.number({ message: "Customer is required" }),
  templateName: z.string().min(1, "Template name is required"),
  frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  startDate: z.string(),
  endDate: z.string().optional(),
  autoEmail: z.boolean().default(false),
  autoCharge: z.boolean().default(false),
  paymentTerms: z.string().optional(),
  memo: z.string().optional(),
});

type RecurringFormValues = z.infer<typeof recurringFormSchema>;

export default function RecurringInvoiceForm() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/contacts?type=customer"],
  });

  const { data: template } = useQuery({
    queryKey: id ? [`/api/recurring/${id}`] : [],
    enabled: !!id,
  });

  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: template ? {
      customerId: template.customerId,
      templateName: template.templateName,
      frequency: template.frequency,
      startDate: format(new Date(template.startDate), "yyyy-MM-dd"),
      endDate: template.endDate ? format(new Date(template.endDate), "yyyy-MM-dd") : "",
      autoEmail: template.autoEmail,
      autoCharge: template.autoCharge,
      paymentTerms: template.paymentTerms,
      memo: template.memo,
    } : {
      startDate: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: RecurringFormValues) => apiRequest("POST", "/api/recurring", data),
    onSuccess: () => {
      toast({ title: "Template created" });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      navigate("/recurring-invoices");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RecurringFormValues) => apiRequest("PUT", `/api/recurring/${id}`, data),
    onSuccess: () => {
      toast({ title: "Template updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
      navigate("/recurring-invoices");
    },
  });

  const onSubmit = (data: RecurringFormValues) => {
    if (id) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{id ? "Edit" : "Create"} Recurring Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="templateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Service Invoice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c: any) => (
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
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
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
              </div>

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

              <div className="space-y-3">
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
                      <FormLabel className="!mt-0 cursor-pointer">Auto-charge payment method</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {id ? "Update" : "Create"} Template
                </Button>
                <Button variant="outline" type="button" onClick={() => navigate("/recurring-invoices")}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
