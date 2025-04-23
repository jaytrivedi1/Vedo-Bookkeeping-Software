import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { insertContactSchema } from "@shared/schema";

// Extend the schema with validation
const vendorFormSchema = insertContactSchema.extend({
  name: z.string().min(1, "Vendor name is required"),
  // Type is always "vendor"
  type: z.literal("vendor"),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface VendorFormProps {
  initialValues?: VendorFormValues;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function VendorForm({ 
  initialValues, 
  onSuccess, 
  onCancel
}: VendorFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with default values
  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialValues || {
      name: "",
      contactName: "",
      type: "vendor",
      email: "",
      phone: "",
      address: "",
      currency: "USD",
      defaultTaxRate: 0,
    },
  });
  
  // Mutation for creating a new vendor
  const createVendor = useMutation({
    mutationFn: (data: VendorFormValues) => {
      return apiRequest("/api/contacts", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/contacts'],
      });
      toast({
        title: "Success",
        description: "Vendor has been created successfully",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create vendor. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating vendor:", error);
    },
  });
  
  // Mutation for updating an existing vendor
  const updateVendor = useMutation({
    mutationFn: (data: { id: number; vendor: VendorFormValues }) => {
      return apiRequest(`/api/contacts/${data.id}`, "PATCH", data.vendor);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/contacts'],
      });
      toast({
        title: "Success",
        description: "Vendor has been updated successfully",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating vendor:", error);
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: VendorFormValues) => {
    setIsSubmitting(true);
    try {
      if (initialValues && 'id' in initialValues) {
        await updateVendor.mutateAsync({
          id: (initialValues as any).id,
          vendor: data,
        });
      } else {
        await createVendor.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Company Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Contact Name */}
          <FormField
            control={form.control}
            name="contactName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Name</FormLabel>
                <FormControl>
                  <Input placeholder="Contact person's name" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Email address" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address" rows={3} {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Notes field removed - not in Contact model */}
        
        {/* Hidden field for type */}
        <input type="hidden" {...form.register("type")} value="vendor" />
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : initialValues && 'id' in initialValues ? "Update Vendor" : "Add Vendor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}