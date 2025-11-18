import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { InsertContact, insertContactSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Card, CardContent } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

// Extended schema with validation
const customerFormSchema = insertContactSchema.extend({
  // Validate email format when provided, but make it optional
  email: z.union([z.string().email("Invalid email address"), z.literal("")]).optional(),
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
  // Type is always "customer"
  type: z.literal("customer"),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const PREFERRED_CURRENCIES = ["USD", "CAD", "GBP", "EUR", "INR"];
const ALL_CURRENCIES = [
  ...PREFERRED_CURRENCIES,
  "AUD", "CHF", "CNY", "JPY", "NZD", "HKD", "SGD", "SEK", "NOK", "DKK", 
  "PLN", "ZAR", "BRL", "MXN", "AED", "SAR", "RUB", "TRY", "IDR", "MYR", 
  "PHP", "THB", "VND", "KRW"
];

export default function CustomerForm({ onSuccess, onCancel }: CustomerFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Transform currencies for SearchableSelect
  const currencyItems: SearchableSelectItem[] = ALL_CURRENCIES.map(code => ({
    value: code,
    label: `${code} - ${getCurrencyName(code)}`,
    subtitle: undefined
  }));
  
  // Form with validation
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
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
      type: "customer",
      currency: "USD",
      defaultTaxRate: 0,
      documentIds: [],
    }
  });
  
  // Create customer mutation
  const createCustomer = useMutation({
    mutationFn: async (data: CustomerFormValues) => {
      // Handle file upload logic here if needed
      const response = await apiRequest('/api/contacts', 'POST', data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add customer. " + error,
        variant: "destructive",
      });
    }
  });
  
  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Form submission
  const onSubmit = (data: CustomerFormValues) => {
    // For now, we'll just handle basic form submission
    // In a real app, you would handle the file upload separately
    createCustomer.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} data-testid="input-customer-name" />
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
                  <Input placeholder="Enter primary contact's name" {...field} data-testid="input-customer-contact-name" />
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
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} data-testid="input-customer-email" />
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
                    <Input placeholder="Enter phone number" {...field} data-testid="input-customer-phone" />
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
                    onChange={field.onChange}
                    onSelect={(address) => {
                      form.setValue("street1", address.street1 || "");
                      form.setValue("street2", address.street2 || "");
                      form.setValue("city", address.city || "");
                      form.setValue("state", address.state || "");
                      form.setValue("postalCode", address.postalCode || "");
                      form.setValue("country", address.country || "");
                    }}
                    placeholder="Start typing address..."
                    data-testid="input-customer-street1"
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
                  <Input placeholder="Apartment, suite, etc. (optional)" {...field} data-testid="input-customer-street2" />
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
                    <Input placeholder="Enter city" {...field} data-testid="input-customer-city" />
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
                    <Input placeholder="Enter state/province" {...field} data-testid="input-customer-state" />
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
                    <Input placeholder="Enter postal code" {...field} data-testid="input-customer-postal-code" />
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
                    <Input placeholder="Enter country" {...field} data-testid="input-customer-country" />
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
                  <FormLabel>Currency</FormLabel>
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
                      data-testid="input-customer-tax-rate"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Hidden field for type - always "customer" */}
          <input type="hidden" {...form.register("type")} value="customer" />
          
          {/* Document upload */}
          <div>
            <FormLabel className="mb-2 block">Attach Documents</FormLabel>
            <div className="flex flex-col gap-2">
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-4 hover:border-primary transition-colors"
              >
                <Upload className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  Click to select document
                </span>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              
              {selectedFile && (
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                  <div className="flex items-center">
                    <Upload className="h-4 w-4 text-blue-500 mr-2" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={createCustomer.isPending}
          >
            {createCustomer.isPending ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Helper function to get currency names
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