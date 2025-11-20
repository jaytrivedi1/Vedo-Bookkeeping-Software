import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { insertContactSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const vendorFormSchema = insertContactSchema.extend({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  currency: z.string().min(1, "Currency is required"),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  defaultTaxRate: z.number().optional(),
  documentIds: z.array(z.string()).optional(),
  type: z.literal("vendor"),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface AddVendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (vendorId: number) => void;
}

const PREFERRED_CURRENCIES = ["USD", "CAD", "GBP", "EUR", "INR"];
const ALL_CURRENCIES = [
  ...PREFERRED_CURRENCIES,
  "AUD", "CHF", "CNY", "JPY", "NZD", "HKD", "SGD", "SEK", "NOK", "DKK", 
  "PLN", "ZAR", "BRL", "MXN", "AED", "SAR", "RUB", "TRY", "IDR", "MYR", 
  "PHP", "THB", "VND", "KRW"
];

function getCurrencyName(code: string): string {
  const currencies: Record<string, string> = {
    USD: "US Dollar",
    CAD: "Canadian Dollar",
    GBP: "British Pound",
    EUR: "Euro",
    INR: "Indian Rupee",
    AUD: "Australian Dollar",
    CHF: "Swiss Franc",
    CNY: "Chinese Yuan",
    JPY: "Japanese Yen",
    NZD: "New Zealand Dollar",
    HKD: "Hong Kong Dollar",
    SGD: "Singapore Dollar",
    SEK: "Swedish Krona",
    NOK: "Norwegian Krone",
    DKK: "Danish Krone",
    PLN: "Polish Złoty",
    ZAR: "South African Rand",
    BRL: "Brazilian Real",
    MXN: "Mexican Peso",
    AED: "UAE Dirham",
    SAR: "Saudi Riyal",
    RUB: "Russian Ruble",
    TRY: "Turkish Lira",
    IDR: "Indonesian Rupiah",
    MYR: "Malaysian Ringgit",
    PHP: "Philippine Peso",
    THB: "Thai Baht",
    VND: "Vietnamese Dong",
    KRW: "South Korean Won"
  };
  
  return currencies[code] || code;
}

export default function AddVendorDialog({ 
  open, 
  onOpenChange,
  onSuccess 
}: AddVendorDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const { data: preferences } = useQuery({
    queryKey: ['/api/preferences'],
  });
  
  const homeCurrency = preferences?.homeCurrency || 'CAD';
  
  const currencyItems: SearchableSelectItem[] = ALL_CURRENCIES.map(code => ({
    value: code,
    label: `${code} - ${getCurrencyName(code)}`,
    subtitle: undefined
  }));
  
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      type: "vendor",
      currency: homeCurrency,
      defaultTaxRate: 0,
      documentIds: [],
    }
  });
  
  const createVendor = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const response = await apiRequest('/api/contacts', 'POST', data);
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Success",
        description: "Vendor added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      form.reset();
      setSelectedFile(null);
      onOpenChange(false);
      if (onSuccess && data?.id) {
        onSuccess(data.id);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add vendor. " + error,
        variant: "destructive",
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const onSubmit = (data: VendorFormValues) => {
    createVendor.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vendor</DialogTitle>
          <DialogDescription>
            Add a new vendor to your contacts. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} data-testid="input-vendor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter primary contact's name" {...field} data-testid="input-vendor-contact-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@example.com" {...field} data-testid="input-vendor-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} data-testid="input-vendor-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="street1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address 1</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        onAddressSelect={(address) => {
                          form.setValue("street1", address.street1 || "");
                          form.setValue("street2", address.street2 || "");
                          form.setValue("city", address.city || "");
                          form.setValue("state", address.state || "");
                          form.setValue("postalCode", address.postalCode || "");
                          form.setValue("country", address.country || "");
                        }}
                        placeholder="Start typing address..."
                        data-testid="input-vendor-street1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="street2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Apartment, suite, etc. (optional)" {...field} data-testid="input-vendor-street2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter city" {...field} data-testid="input-vendor-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state/province" {...field} data-testid="input-vendor-state" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter postal code" {...field} data-testid="input-vendor-postal-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter country" {...field} data-testid="input-vendor-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <SearchableSelect
                        items={currencyItems}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Select currency"
                        searchPlaceholder="Search currencies..."
                        emptyText="No currencies found"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="defaultTaxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Sales Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="0.01" 
                          placeholder="0.0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-vendor-tax-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <input type="hidden" {...form.register("type")} value="vendor" />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-vendor"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createVendor.isPending}
                data-testid="button-save-vendor"
              >
                {createVendor.isPending ? 'Saving...' : 'Save Vendor'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
