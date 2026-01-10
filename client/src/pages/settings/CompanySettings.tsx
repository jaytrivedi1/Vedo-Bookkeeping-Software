import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Building2,
  Upload,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  RefreshCw,
  Palette,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MONTH_OPTIONS } from "@shared/fiscalYear";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

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
  const [isDragging, setIsDragging] = useState(false);
  const [logoSize, setLogoSize] = useState(60);
  const [logoAlignment, setLogoAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [showOnDark, setShowOnDark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const watchedValues = form.watch();

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
      // Load saved logo settings if available
      if (data.logoSize) setLogoSize(data.logoSize);
      if (data.logoAlignment) setLogoAlignment(data.logoAlignment);
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

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PNG, JPG, or SVG image.",
        variant: "destructive",
      });
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const uploadLogo = async (file: File) => {
    if (!validateFile(file)) return;
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogo(file);
    }
    event.target.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadLogo(files[0]);
    }
  }, [companyQuery.data]);

  const handleRemoveLogo = async () => {
    if (!companyQuery.data) return;

    try {
      const companyId = (companyQuery.data as any).id;
      await apiRequest(`/api/companies/${companyId}`, 'PATCH', { logoUrl: null });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      toast({
        title: "Logo removed",
        description: "Your company logo has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove logo",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (values: z.infer<typeof companyFormSchema>) => {
    saveCompanyDetails.mutate(values);
  };

  const logoUrl = (companyQuery.data as any)?.logoUrl;
  const companyName = watchedValues.name || "Your Company";
  const companyAddress = [
    watchedValues.street1,
    watchedValues.city,
    watchedValues.state,
    watchedValues.postalCode
  ].filter(Boolean).join(', ') || "123 Business Street, City, State";

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

      {/* Brand Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Identity
          </CardTitle>
          <CardDescription>
            Upload your logo and customize how it appears on invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Left Zone - Editor */}
            <div className="space-y-6">
              {/* Upload Zone */}
              {!logoUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                    isDragging
                      ? "border-sky-400 bg-sky-50"
                      : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleFileChange}
                    disabled={isUploadingLogo}
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className={cn(
                      "p-4 rounded-full",
                      isDragging ? "bg-sky-100" : "bg-slate-100"
                    )}>
                      <Upload className={cn(
                        "h-8 w-8",
                        isDragging ? "text-sky-600" : "text-slate-400"
                      )} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">
                        {isUploadingLogo ? "Uploading..." : "Drag & drop your logo"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        or click to browse
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      PNG, JPG, or SVG (max 2MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Logo Canvas */}
                  <div
                    className="relative rounded-xl p-6 flex items-center justify-center min-h-[160px]"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      style={{ height: logoSize }}
                      className="object-contain max-w-full"
                    />
                  </div>

                  {/* Size Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Logo Size</label>
                      <span className="text-sm text-slate-500">{logoSize}px</span>
                    </div>
                    <Slider
                      value={[logoSize]}
                      onValueChange={(value) => setLogoSize(value[0])}
                      min={20}
                      max={150}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>20px</span>
                      <span>150px</span>
                    </div>
                  </div>

                  {/* Alignment Buttons */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Alignment</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'left', icon: AlignLeft, label: 'Left' },
                        { value: 'center', icon: AlignCenter, label: 'Center' },
                        { value: 'right', icon: AlignRight, label: 'Right' },
                      ].map(({ value, icon: Icon, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLogoAlignment(value as 'left' | 'center' | 'right')}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            logoAlignment === value
                              ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-sm font-medium text-slate-600 hover:text-red-600 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleFileChange}
                      disabled={isUploadingLogo}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Zone - Context Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-slate-700">Invoice Preview</h4>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnDark}
                    onChange={(e) => setShowOnDark(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Dark background
                </label>
              </div>

              {/* Mini Invoice Header Preview */}
              <div
                className={cn(
                  "rounded-xl p-6 transition-colors",
                  showOnDark ? "bg-slate-800" : "bg-white shadow-sm border border-slate-200"
                )}
              >
                <div
                  className={cn(
                    "flex gap-4 pb-4 border-b",
                    showOnDark ? "border-slate-700" : "border-slate-200",
                    logoAlignment === 'center' && "flex-col items-center text-center",
                    logoAlignment === 'right' && "flex-row-reverse"
                  )}
                >
                  {/* Logo */}
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      style={{ height: Math.min(logoSize * 0.6, 60) }}
                      className="object-contain"
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex items-center justify-center rounded",
                        showOnDark ? "bg-slate-700" : "bg-slate-100"
                      )}
                      style={{ width: 48, height: Math.min(logoSize * 0.6, 48) }}
                    >
                      <ImageIcon className={cn(
                        "h-5 w-5",
                        showOnDark ? "text-slate-500" : "text-slate-400"
                      )} />
                    </div>
                  )}

                  {/* Company Info */}
                  <div className={cn(
                    logoAlignment === 'right' && "text-left",
                    logoAlignment === 'left' && "text-left"
                  )}>
                    <p className={cn(
                      "font-semibold text-sm",
                      showOnDark ? "text-white" : "text-slate-900"
                    )}>
                      {companyName}
                    </p>
                    <p className={cn(
                      "text-xs mt-1 max-w-[180px]",
                      showOnDark ? "text-slate-400" : "text-slate-500"
                    )}>
                      {companyAddress}
                    </p>
                  </div>
                </div>

                {/* Sample Invoice Content */}
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className={cn(
                      "text-xs font-medium",
                      showOnDark ? "text-slate-300" : "text-slate-700"
                    )}>
                      INVOICE
                    </span>
                    <span className={cn(
                      "text-xs",
                      showOnDark ? "text-slate-500" : "text-slate-400"
                    )}>
                      #INV-001
                    </span>
                  </div>
                  <div className={cn(
                    "h-2 rounded-full w-3/4",
                    showOnDark ? "bg-slate-700" : "bg-slate-100"
                  )} />
                  <div className={cn(
                    "h-2 rounded-full w-1/2",
                    showOnDark ? "bg-slate-700" : "bg-slate-100"
                  )} />
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">
                This preview shows how your logo will appear on invoices
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information Card */}
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
