import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Product, insertProductSchema } from "@shared/schema";

// Create Zod schema for form validation with improved handling for numeric values
const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, { message: "Name is required" }),
  type: z.enum(["product", "service"]),
  price: z.coerce.number().min(0),
  isActive: z.boolean().default(true),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  // Use coerce to ensure these are always numbers
  accountId: z.coerce.number().int().nonnegative(),
  salesTaxId: z.coerce.number().int().nonnegative(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  defaultType?: "product" | "service";
}

export function ProductDialog({ open, onOpenChange, product, defaultType = "product" }: ProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all revenue accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Get all sales taxes for dropdown
  const { data: salesTaxes = [] } = useQuery({
    queryKey: ['/api/sales-taxes'],
  });

  // Filter only revenue accounts
  const revenueAccounts = accounts.filter((account: any) => 
    account.type === 'revenue' || 
    account.type === 'other_income'
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: defaultType,
      price: 0,
      isActive: true,
      accountId: 0,
      salesTaxId: 0,
    },
  });

  // Update form when editing an existing product
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        type: product.type,
        sku: product.sku,
        price: typeof product.price === 'string' ? parseFloat(product.price) : product.price,
        cost: product.cost,
        isActive: product.isActive,
        accountId: product.accountId || 0,
        salesTaxId: product.salesTaxId || 0,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        type: defaultType,
        price: 0,
        isActive: true,
        accountId: 0,
        salesTaxId: 0,
      });
    }
  }, [product, form]);

  const onSubmit = async (data: ProductFormValues) => {
    console.log("Form data before submission:", data);
    setIsSubmitting(true);
    try {
      // Ensure consistent data format
      const formattedData = {
        ...data,
        // Convert price to string for DB if needed
        price: typeof data.price === 'number' ? data.price.toString() : data.price,
        // Ensure accountId and salesTaxId are numbers
        accountId: Number(data.accountId),
        salesTaxId: Number(data.salesTaxId),
      };

      console.log("Formatted data for submission:", formattedData);

      if (product) {
        // Update existing product
        await apiRequest(`/api/products/${product.id}`, 'PATCH', formattedData);
        toast({
          title: "Product updated",
          description: "Product has been updated successfully.",
        });
      } else {
        // Create new product
        await apiRequest('/api/products', 'POST', formattedData);
        toast({
          title: "Product created",
          description: "New product has been created successfully.",
        });
      }
      // Refresh products data
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: product 
          ? "Failed to update product. Please try again." 
          : "Failed to create product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product 
              ? "Update the details for this product or service." 
              : "Fill in the details to create a new product or service."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Product Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter product name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter description" 
                      {...field} 
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      min="0" 
                      step="0.01" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Revenue Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue Account</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))} 
                    defaultValue={field.value?.toString() || "0"}
                    value={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select revenue account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {revenueAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The revenue account where sales will be recorded
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sales Tax */}
            <FormField
              control={form.control}
              name="salesTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Tax</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(Number(value))} 
                    defaultValue={field.value?.toString() || "0"}
                    value={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sales tax" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {salesTaxes.map((tax: any) => (
                        <SelectItem key={tax.id} value={tax.id.toString()}>
                          {tax.name} ({tax.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The default sales tax applied to this product
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive products won't appear in dropdown lists
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

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : product
                  ? "Update Product"
                  : "Create Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}