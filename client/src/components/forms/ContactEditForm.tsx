import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Contact } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Form schema based on existing contact types
const contactEditSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(['customer', 'vendor']), // Removed 'both' option
  currency: z.string().optional(),
  defaultTaxRate: z.number().optional().nullable(),
});

type ContactEditFormValues = z.infer<typeof contactEditSchema>;

interface ContactEditFormProps {
  contact: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ContactEditForm({ contact, onSuccess, onCancel }: ContactEditFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Set up the form with default values from the existing contact
  const form = useForm<ContactEditFormValues>({
    resolver: zodResolver(contactEditSchema),
    defaultValues: {
      name: contact.name || "",
      contactName: contact.contactName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      // Convert "both" to "customer" or handle other types for backward compatibility
      type: contact.type === "both" 
        ? "customer" 
        : (contact.type === "customer" || contact.type === "vendor") 
          ? contact.type 
          : "customer",
      currency: contact.currency || "USD",
      defaultTaxRate: contact.defaultTaxRate || null,
    },
  });
  
  // Mutation for updating the contact
  const updateContact = useMutation({
    mutationFn: async (data: ContactEditFormValues) => {
      return apiRequest('PATCH', `/api/contacts/${contact.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Contact updated",
        description: "The contact has been updated successfully.",
        variant: "default",
      });
      // Invalidate the contacts query to refetch the updated list
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      onSuccess(); // Close the form/dialog
    },
    onError: (error) => {
      console.error("Error updating contact:", error);
      toast({
        title: "Failed to update contact",
        description: "There was an error updating the contact. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = (data: ContactEditFormValues) => {
    setIsSubmitting(true);
    updateContact.mutate(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Business or person name" {...field} />
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
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input placeholder="Primary contact name" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
        
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="Full address" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="USD" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Notes field removed - not in Contact model */}
        
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}