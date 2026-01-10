import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MONTH_OPTIONS } from "@shared/fiscalYear";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const companyFormSchema = z.object({
  name: z.string().min(1, { message: "Company name is required." }),
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([
    z.string().email({ message: "Please enter a valid email address." }),
    z.literal("")
  ]).optional(),
  website: z.union([
    z.string().url({ message: "Please enter a valid URL." }),
    z.literal("")
  ]).optional(),
  taxId: z.string().optional(),
  fiscalYearStartMonth: z.number().min(1).max(12),
});

export default function CompanySettings() {
  const { toast } = useToast();
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const companyQuery = useQuery({
    queryKey: ['/api/companies/default'],
  });

  const form = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      street1: "",
      street2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      taxId: "",
      fiscalYearStartMonth: 1,
    },
  });

  const monthItems: SearchableSelectItem[] = MONTH_OPTIONS.map(month => ({
    value: month.value.toString(),
    label: month.label,
    subtitle: undefined
  }));

  useEffect(() => {
    if (companyQuery.data && Object.keys(companyQuery.data).length > 0) {
      const data = companyQuery.data as any;
      form.reset({
        name: data.name || "",
        street1: data.street1 || "",
        street2: data.street2 || "",
        city: data.city || "",
        state: data.state || "",
        postalCode: data.postalCode || "",
        country: data.country || "",
        phone: data.phone || "",
        email: data.email || "",
        website: data.website || "",
        taxId: data.taxId || "",
        fiscalYearStartMonth: data.fiscalYearStartMonth || 1,
      });
    }
  }, [companyQuery.data, form]);

  const saveCompanyDetails = useMutation({
    mutationFn: async (values: z.infer<typeof companyFormSchema>) => {
      const companyId = (companyQuery.data as any)?.id;
      if (!companyId) throw new Error("Company ID not found");
      return await apiRequest(`/api/companies/${companyId}`, 'PATCH', values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Company details saved",
        description: "Your company information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving company details",
        description: error?.message || "There was a problem saving your company information.",
        variant: "destructive",
      });
    }
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!companyQuery.data) {
      toast({
        title: "Error",
        description: "Company information not loaded",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const companyId = (companyQuery.data as any).id;
      const response = await fetch(`/api/companies/${companyId}/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      await companyQuery.refetch();

      toast({
        title: "Logo uploaded",
        description: "Your company logo has been uploaded successfully.",
      });

      event.target.value = '';
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = (values: z.infer<typeof companyFormSchema>) => {
    saveCompanyDetails.mutate(values);
  };

  if (companyQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Company Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your company details and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
          <CardDescription>
            This information appears on your invoices and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo Upload */}
              <div>
                <FormLabel>Company Logo</FormLabel>
                <div className="mt-2 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-gray-50 overflow-hidden">
                    {(companyQuery.data as any)?.logoUrl ? (
                      <img
                        src={(companyQuery.data as any).logoUrl}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Settings className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    className="relative"
                    disabled={isUploadingLogo}
                  >
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                    />
                    {isUploadingLogo ? "Uploading..." : "Upload logo"}
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value || ""}
                        onChange={field.onChange}
                        onSelect={(address) => {
                          form.setValue("street1", address.street1);
                          form.setValue("street2", address.street2);
                          form.setValue("city", address.city);
                          form.setValue("state", address.state);
                          form.setValue("postalCode", address.postalCode);
                          form.setValue("country", address.country);
                        }}
                        placeholder="Start typing your address..."
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
                    <FormLabel>Apartment, Suite, etc. (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Apartment, suite, unit, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax ID / Business Number</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fiscalYearStartMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Start Month</FormLabel>
                    <SearchableSelect
                      items={monthItems}
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      placeholder="Select first month of fiscal year"
                      searchPlaceholder="Search months..."
                      emptyText="No months found"
                    />
                    <p className="text-sm text-muted-foreground">
                      This setting affects all financial reports and determines how fiscal periods are calculated
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={saveCompanyDetails.isPending || companyQuery.isLoading}
                className="w-full"
              >
                {saveCompanyDetails.isPending ? "Saving..." : "Save Company Details"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
