import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, Product } from "@shared/schema";

// Simplified schema for quick product creation
const addProductSchema = insertProductSchema.extend({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["product", "service"]),
  price: z.coerce.number().min(0),
  accountId: z.coerce.number().int().positive("Revenue account is required"),
  salesTaxId: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
});

type AddProductFormData = z.infer<typeof addProductSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (product: Product) => void;
  defaultType?: "product" | "service";
}

export default function AddProductDialog({ 
  open, 
  onOpenChange, 
  onSuccess,
  defaultType = "product"
}: AddProductDialogProps) {
  const { toast } = useToast();

  // Get all revenue accounts for dropdown
  const { data: accounts = [] } = useQuery({
    queryKey: ['/api/accounts'],
  });

  // Get all sales taxes for dropdown
  const { data: salesTaxes = [] } = useQuery({
    queryKey: ['/api/sales-taxes'],
  });

  // Filter only revenue accounts
  const revenueAccounts = accounts.filter((account: any) => {
    if (account.type === 'liability' || 
        account.type === 'accounts_payable' || 
        account.type === 'other_current_liabilities' ||
        account.type === 'long_term_liabilities' ||
        account.type === 'other_income') {
      return false;
    }
    
    const isRevenueType = account.type === 'revenue' || account.type === 'income';
    const isRevenueByName = typeof account.name === 'string' && (
      account.name.toLowerCase().includes('revenue') ||
      account.name.toLowerCase().includes('sales')
    ) && !account.name.toLowerCase().includes('tax payable') &&
       !account.name.toLowerCase().includes('interest');
    
    return isRevenueType || isRevenueByName;
  });

  // Transform for SearchableSelect
  const revenueAccountItems: SearchableSelectItem[] = revenueAccounts.map((account: any) => ({
    value: account.id.toString(),
    label: account.name,
    subtitle: undefined
  }));

  const taxItems: SearchableSelectItem[] = [
    { value: '0', label: 'No tax', subtitle: undefined },
    ...salesTaxes.map((tax: any) => ({
      value: tax.id.toString(),
      label: tax.name,
      subtitle: tax.rate ? `· ${tax.rate}%` : undefined
    }))
  ];

  const form = useForm<AddProductFormData>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      type: defaultType,
      price: 0,
      accountId: 0,
      salesTaxId: 0,
      isActive: true,
    },
  });

  const onSubmit = async (data: AddProductFormData) => {
    try {
      const formattedData = {
        ...data,
        price: data.price.toString(),
        accountId: Number(data.accountId),
        salesTaxId: data.salesTaxId === 0 ? null : Number(data.salesTaxId),
      };

      const product = await apiRequest('/api/products', 'POST', formattedData);
      
      toast({
        title: "Product created",
        description: `${data.name} has been created successfully.`,
      });

      onSuccess(product);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New {defaultType === "service" ? "Service" : "Product"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Product/Service Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} data-testid="input-product-name" />
                  </FormControl>
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
                      data-testid="input-product-price"
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
                  <SearchableSelect
                    items={revenueAccountItems}
                    value={field.value?.toString() || "0"}
                    onValueChange={(value) => field.onChange(Number(value))}
                    placeholder="Select revenue account"
                    searchPlaceholder="Search accounts..."
                    emptyText="No accounts found."
                    data-testid="select-revenue-account"
                  />
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
                  <FormLabel>Sales Tax (Optional)</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      items={taxItems}
                      value={field.value?.toString() || "0"}
                      onValueChange={(value) => field.onChange(Number(value))}
                      placeholder="Select sales tax"
                      searchPlaceholder="Search taxes..."
                      emptyText="No taxes found."
                      data-testid="select-sales-tax"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save">
                Add {form.watch("type") === "service" ? "Service" : "Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
