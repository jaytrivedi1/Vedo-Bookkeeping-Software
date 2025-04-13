import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { SalesTax } from "@shared/schema";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  AlertCircleIcon,
  CheckCircleIcon
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Form schema for creating/editing tax rates
const salesTaxFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z.string().nullable().optional(),
  rate: z.coerce.number().min(0, { message: "Rate must be a positive number." }).max(100, { message: "Rate cannot exceed 100%." }).refine(
    (val) => {
      // Allow 3 decimal places for precision (e.g., 9.975%)
      const rounded = parseFloat(val.toFixed(3));
      return Math.abs(val - rounded) < 0.0001;
    },
    { message: "Rate can have up to 3 decimal places." }
  ),
  accountId: z.coerce.number().nullable().optional(),
  isActive: z.boolean().default(true),
});

type SalesTaxFormValues = z.infer<typeof salesTaxFormSchema>;

export default function SalesTaxes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<SalesTax | null>(null);
  const [deletingTax, setDeletingTax] = useState<SalesTax | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch all sales taxes
  const { data: salesTaxes, isLoading } = useQuery<SalesTax[]>({
    queryKey: ["/api/sales-taxes"],
  });

  // Fetch all accounts for the form's account selection
  const { data: accounts } = useQuery<any[]>({
    queryKey: ["/api/accounts"],
  });

  // Form setup
  const form = useForm<SalesTaxFormValues>({
    resolver: zodResolver(salesTaxFormSchema),
    defaultValues: {
      name: "",
      description: "",
      rate: 0,
      accountId: null,
      isActive: true,
    },
  });

  // Create a new sales tax
  const createMutation = useMutation({
    mutationFn: async (values: SalesTaxFormValues) => {
      // Handle the case where accountId is 0 (meaning "None")
      const processedValues = {
        ...values,
        accountId: values.accountId === 0 ? null : values.accountId
      };
      return await apiRequest("POST", "/api/sales-taxes", processedValues);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-taxes"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sales tax created",
        description: "The sales tax has been successfully created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating sales tax",
        description: "There was an error creating the sales tax. Please try again.",
        variant: "destructive",
      });
      console.error("Create error:", error);
    },
  });

  // Update an existing sales tax
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: SalesTaxFormValues }) => {
      // Handle the case where accountId is 0 (meaning "None")
      const processedValues = {
        ...values,
        accountId: values.accountId === 0 ? null : values.accountId
      };
      return await apiRequest("PATCH", `/api/sales-taxes/${id}`, processedValues);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-taxes"] });
      setIsDialogOpen(false);
      setEditingTax(null);
      form.reset();
      toast({
        title: "Sales tax updated",
        description: "The sales tax has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error updating sales tax",
        description: "There was an error updating the sales tax. Please try again.",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });

  // Delete a sales tax
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales-taxes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-taxes"] });
      setIsDeleteDialogOpen(false);
      setDeletingTax(null);
      toast({
        title: "Sales tax deleted",
        description: "The sales tax has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting sales tax",
        description: "There was an error deleting the sales tax. Please try again.",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    },
  });

  // Handle form submission
  const onSubmit = (values: SalesTaxFormValues) => {
    if (editingTax) {
      updateMutation.mutate({ id: editingTax.id, values });
    } else {
      createMutation.mutate(values);
    }
  };

  // Open edit dialog with tax data
  const handleEditTax = (tax: SalesTax) => {
    setEditingTax(tax);
    form.reset({
      name: tax.name,
      description: tax.description,
      rate: tax.rate,
      accountId: tax.accountId,
      isActive: tax.isActive === true,
    });
    setIsDialogOpen(true);
  };

  // Open create dialog with empty form
  const handleCreateTax = () => {
    setEditingTax(null);
    form.reset({
      name: "",
      description: "",
      rate: 0,
      accountId: null,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  // Confirm delete dialog
  const handleDeleteClick = (tax: SalesTax) => {
    setDeletingTax(tax);
    setIsDeleteDialogOpen(true);
  };

  // Format rate as percentage
  const formatRate = (rate: number) => {
    // Check if the rate has a fractional part that needs 3 decimal places
    const hasThreeDecimals = (rate * 1000) % 10 !== 0;
    return `${rate.toFixed(hasThreeDecimals ? 3 : 2)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sales Taxes</h1>
          <p className="text-muted-foreground">Manage sales tax rates for your invoices and expenses</p>
        </div>
        <Button onClick={handleCreateTax}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Tax Rate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Rates</CardTitle>
          <CardDescription>
            Configure sales tax rates that will be applied to your invoices and expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : salesTaxes && salesTaxes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTaxes.map((tax) => (
                  <TableRow key={tax.id}>
                    <TableCell className="font-medium">{tax.name}</TableCell>
                    <TableCell>{tax.description || "-"}</TableCell>
                    <TableCell>{formatRate(tax.rate)}</TableCell>
                    <TableCell>
                      {tax.isActive ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                          <AlertCircleIcon className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTax(tax)}
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(tax)}
                      >
                        <TrashIcon className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No sales taxes found. Create your first one!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingTax ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
            <DialogDescription>
              {editingTax
                ? "Update the details of your sales tax rate."
                : "Create a new sales tax rate for your business."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="GST/HST" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the tax (e.g., GST, VAT, Sales Tax)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of the tax"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        max="100"
                        placeholder="5.000"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The percentage rate (e.g., 5.00 for 5%, 9.975 for 9.975%)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Liability Account</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value !== "0" ? parseInt(value) : null)}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {accounts && accounts
                          .filter(account => 
                            account.type === "accounts_payable" || 
                            account.type === "other_current_liabilities"
                          )
                          .map((account) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.code} - {account.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The account where collected tax will be recorded
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Inactive taxes won't appear in dropdown menus
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>{editingTax ? "Update" : "Create"}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Tax Rate</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tax rate? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 mb-4 border rounded-md bg-yellow-50">
            <p className="font-medium">{deletingTax?.name}</p>
            <p className="text-sm text-muted-foreground">{formatRate(deletingTax?.rate || 0)}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingTax && deleteMutation.mutate(deletingTax.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}