import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Contact } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, XCircle, CheckCircle } from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

// Extended schema with validation - match VendorForm exactly
const contactEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(['customer', 'vendor']),
  currency: z.string().min(1, "Currency is required"),
  defaultTaxRate: z.number().optional(),
  documentIds: z.array(z.string()).optional(),
});

type ContactEditFormValues = z.infer<typeof contactEditSchema>;

interface ContactEditFormProps {
  contact: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

const PREFERRED_CURRENCIES = ["USD", "CAD", "GBP", "EUR", "INR"];
const ALL_CURRENCIES = [
  ...PREFERRED_CURRENCIES,
  "AUD", "CHF", "CNY", "JPY", "NZD", "HKD", "SGD", "SEK", "NOK", "DKK", 
  "PLN", "ZAR", "BRL", "MXN", "AED", "SAR", "RUB", "TRY", "IDR", "MYR", 
  "PHP", "THB", "VND", "KRW"
];

export default function ContactEditForm({ contact, onSuccess, onCancel }: ContactEditFormProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currencyLocked, setCurrencyLocked] = useState(false);
  
  // Check if contact (customer or vendor) has transactions to lock currency
  const { data: contactTransactions } = useQuery({
    queryKey: ['/api/contacts', contact.id, 'transactions'],
    queryFn: () => apiRequest(`/api/contacts/${contact.id}/transactions`, 'GET'),
    enabled: true // Check for both customers and vendors
  });

  useEffect(() => {
    // Lock currency if contact has any existing transactions
    if (contactTransactions && contactTransactions.length > 0) {
      setCurrencyLocked(true);
    }
  }, [contactTransactions]);
  
  // Transform currencies for SearchableSelect
  const currencyItems: SearchableSelectItem[] = ALL_CURRENCIES.map(code => ({
    value: code,
    label: `${code} - ${getCurrencyName(code)}`,
    subtitle: undefined
  }));
  
  // Set up the form with default values from the existing contact
  const form = useForm<ContactEditFormValues>({
    resolver: zodResolver(contactEditSchema),
    defaultValues: {
      name: contact.name || "",
      contactName: contact.contactName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      type: contact.type === "both" 
        ? "customer" 
        : (contact.type === "customer" || contact.type === "vendor") 
          ? contact.type 
          : "customer",
      currency: contact.currency || "USD",
      defaultTaxRate: contact.defaultTaxRate || 0,
      documentIds: [],
    },
  });
  
  // Mutation for updating the contact
  const updateContact = useMutation({
    mutationFn: async (data: ContactEditFormValues) => {
      return apiRequest(`/api/contacts/${contact.id}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${contact.type === 'vendor' ? 'Vendor' : 'Customer'} updated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'], exact: false });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update ${contact.type === 'vendor' ? 'vendor' : 'customer'}. ` + error,
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting the contact
  const deleteContact = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/contacts/${contact.id}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${contact.type === 'vendor' ? 'Vendor' : 'Customer'} deleted successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'], exact: false });
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || `Failed to delete ${contact.type === 'vendor' ? 'vendor' : 'customer'}`,
        variant: "destructive",
      });
    }
  });

  // Mutation for marking contact as inactive
  const deactivateContact = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/contacts/${contact.id}`, 'PATCH', { isActive: false });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${contact.type === 'vendor' ? 'Vendor' : 'Customer'} marked as inactive`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'], exact: false });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to deactivate ${contact.type === 'vendor' ? 'vendor' : 'customer'}. ` + error,
        variant: "destructive",
      });
    }
  });

  // Mutation for reactivating contact
  const reactivateContact = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/contacts/${contact.id}`, 'PATCH', { isActive: true });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${contact.type === 'vendor' ? 'Vendor' : 'Customer'} reactivated`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'], exact: false });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reactivate ${contact.type === 'vendor' ? 'vendor' : 'customer'}. ` + error,
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
  const onSubmit = (data: ContactEditFormValues) => {
    // For now, we'll just handle basic form submission
    // In a real app, you would handle the file upload separately
    updateContact.mutate(data);
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
                  <Input placeholder="Enter company name" {...field} />
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
                  <Input placeholder="Enter primary contact's name" {...field} />
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
                    <Input type="email" placeholder="email@example.com" {...field} />
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
                    <Input placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter full address" 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
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
                    disabled={currencyLocked}
                  />
                  {currencyLocked && (
                    <FormDescription>
                      Currency cannot be changed because this {contact.type} has existing transactions.
                    </FormDescription>
                  )}
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
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Hidden field for type - preserves the original contact type */}
          <input type="hidden" {...form.register("type")} />
          
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
        
        <div className="flex justify-between items-center pt-4">
          {/* Left side - Destructive actions */}
          <div>
            {contact.isActive === false ? (
              // Reactivate button for inactive contacts
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="outline"
                    disabled={reactivateContact.isPending || (contactTransactions === undefined)}
                    data-testid="button-reactivate-contact"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reactivate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reactivate {contact.type === 'vendor' ? 'Vendor' : 'Customer'}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will make {contact.name} active again and visible in transaction dropdowns.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => reactivateContact.mutate()}
                      disabled={reactivateContact.isPending}
                    >
                      {reactivateContact.isPending ? 'Reactivating...' : 'Reactivate'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : contactTransactions && contactTransactions.length > 0 ? (
              // Mark as inactive button (when transactions exist)
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={deactivateContact.isPending || (contactTransactions === undefined)}
                    data-testid="button-deactivate-contact"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Inactive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark as Inactive?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {contact.name} has {contactTransactions.length} existing transaction(s) and cannot be deleted. 
                      Marking as inactive will hide this {contact.type} from new transactions while preserving historical data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deactivateContact.mutate()}
                      disabled={deactivateContact.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deactivateContact.isPending ? 'Marking Inactive...' : 'Mark Inactive'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              // Delete button (when no transactions)
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="destructive"
                    disabled={deleteContact.isPending || (contactTransactions === undefined)}
                    data-testid="button-delete-contact"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {contact.type === 'vendor' ? 'Vendor' : 'Customer'}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to permanently delete {contact.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteContact.mutate()}
                      disabled={deleteContact.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteContact.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Right side - Save/Cancel buttons */}
          <div className="flex space-x-2">
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
              disabled={updateContact.isPending}
              data-testid="button-save-contact"
            >
              {updateContact.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
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