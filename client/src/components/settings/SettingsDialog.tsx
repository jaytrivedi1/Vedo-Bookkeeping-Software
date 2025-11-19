import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle,
  DialogFooter
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Info, Languages, Moon, Sun, DollarSign, FileText, Sparkles, Minimize2, LayoutTemplate, Check, User, Lock, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MONTH_OPTIONS } from "@shared/fiscalYear";
import InvoiceTemplatePreview from "./InvoiceTemplatePreview";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

// Define schema for company details
const companyFormSchema = z.object({
  name: z.string().min(1, {
    message: "Company name is required.",
  }),
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

// Define schema for password change
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string().min(1, { message: "Please confirm your password" }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Define schema for profile update
const profileUpdateSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  email: z.union([
    z.string().email({ message: "Please enter a valid email address." }),
    z.literal("")
  ]).optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

// Define settings for preferences
interface SettingsState {
  darkMode: boolean;
  multiCurrencyEnabled: boolean;
  homeCurrency: string | null;
  multiCurrencyEnabledAt: Date | null;
  invoiceTemplate?: string;
}

const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional invoice layout with detailed formatting",
    icon: FileText,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean, contemporary design with bold typography",
    icon: Sparkles,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple, uncluttered layout focused on essentials",
    icon: Minimize2,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Space-efficient design for single-page invoices",
    icon: LayoutTemplate,
  },
];

// Define props for the component
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");
  const [selectedHomeCurrency, setSelectedHomeCurrency] = useState<string>("USD");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  
  // Initialize state for settings
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    multiCurrencyEnabled: false,
    homeCurrency: null,
    multiCurrencyEnabledAt: null,
    invoiceTemplate: "classic"
  });
  
  // Query company settings
  const companyQuery = useQuery({
    queryKey: ['/api/companies/default'],
    enabled: open,
  });
  
  // Query user preferences
  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
    enabled: open
  });
  
  // Query currencies
  const currenciesQuery = useQuery({
    queryKey: ['/api/currencies'],
    enabled: open
  });
  
  // Query current user
  const userQuery = useQuery({
    queryKey: ['/api/user'],
    enabled: open
  });
  
  // Process preferences data when it loads
  useEffect(() => {
    if (preferencesQuery.data && Object.keys(preferencesQuery.data).length > 0) {
      const data = preferencesQuery.data as any;
      const template = data.invoiceTemplate || "classic";
      setSettings({
        darkMode: data.darkMode || false,
        multiCurrencyEnabled: data.multiCurrencyEnabled || false,
        homeCurrency: data.homeCurrency || null,
        multiCurrencyEnabledAt: data.multiCurrencyEnabledAt ? new Date(data.multiCurrencyEnabledAt) : null,
        invoiceTemplate: template
      });
      
      // Set selected template
      setSelectedTemplate(template);
      
      // Set selected home currency if available
      if (data.homeCurrency) {
        setSelectedHomeCurrency(data.homeCurrency);
      }
      
      // Apply dark mode if it's enabled
      if (data.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [preferencesQuery.data]);
  
  // Setup form for company details
  const form = useForm<z.infer<typeof companyFormSchema>>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "Your Company Name",
      street1: "",
      street2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      phone: "+1 (555) 123-4567",
      email: "info@yourcompany.com",
      website: "https://yourcompany.com",
      taxId: "12-3456789",
      fiscalYearStartMonth: 1,
    },
  });
  
  // Setup form for password change
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  // Setup form for profile update
  const profileForm = useForm<z.infer<typeof profileUpdateSchema>>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
    },
  });
  
  // Update profile form when user data is loaded
  useEffect(() => {
    if (userQuery.data && Object.keys(userQuery.data).length > 0) {
      const data = userQuery.data as any;
      profileForm.reset({
        username: data.username || "",
        email: data.email || "",
        firstName: data.firstName || "",
        lastName: data.lastName || "",
      });
    }
  }, [userQuery.data, profileForm]);
  
  // Transform month options for SearchableSelect
  const monthItems: SearchableSelectItem[] = MONTH_OPTIONS.map(month => ({
    value: month.value.toString(),
    label: month.label,
    subtitle: undefined
  }));
  
  // Transform currencies for SearchableSelect
  const currencyItems: SearchableSelectItem[] = Array.isArray(currenciesQuery.data) 
    ? currenciesQuery.data.map((currency: any) => ({
        value: currency.code,
        label: `${currency.code} - ${currency.name}`,
        subtitle: currency.symbol
      }))
    : [];
  
  // Update form when company data is loaded
  useEffect(() => {
    if (companyQuery.data && Object.keys(companyQuery.data).length > 0) {
      const data = companyQuery.data as any;
      form.reset({
        name: data.name || "Your Company Name",
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
  
  // Handle saving company details
  const saveCompanyDetails = useMutation({
    mutationFn: async (values: z.infer<typeof companyFormSchema>) => {
      const companyId = (companyQuery.data as any)?.id;
      if (!companyId) {
        throw new Error("Company ID not found");
      }
      return await apiRequest(`/api/companies/${companyId}`, 'PATCH', values);
    },
    onSuccess: () => {
      // Invalidate company settings query to refetch the data
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
  
  // Handle saving preferences
  const savePreferences = useMutation({
    mutationFn: async (values: SettingsState) => {
      return await apiRequest('/api/settings/preferences', 'POST', values);
    },
    onSuccess: (data: any, variables: SettingsState) => {
      // Invalidate both preference query keys to ensure all components see the update
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });
      
      // Use response data if available, otherwise fall back to what we sent (variables)
      const finalDarkMode = data?.darkMode ?? variables.darkMode;
      const finalSettings = {
        darkMode: data?.darkMode ?? variables.darkMode,
        multiCurrencyEnabled: data?.multiCurrencyEnabled ?? variables.multiCurrencyEnabled,
        homeCurrency: data?.homeCurrency ?? variables.homeCurrency,
        multiCurrencyEnabledAt: data?.multiCurrencyEnabledAt 
          ? new Date(data.multiCurrencyEnabledAt) 
          : variables.multiCurrencyEnabledAt,
        invoiceTemplate: data?.invoiceTemplate ?? variables.invoiceTemplate
      };
      
      // Update local state with the final computed settings
      setSettings(finalSettings);
      
      // Update selected template to match saved value
      if (finalSettings.invoiceTemplate) {
        setSelectedTemplate(finalSettings.invoiceTemplate);
      }
      
      // Apply theme change immediately using the final computed value
      if (finalDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving preferences",
        description: error?.message || "There was a problem saving your preferences.",
        variant: "destructive",
      });
    }
  });
  
  // Handle password change
  const changePassword = useMutation({
    mutationFn: async (values: z.infer<typeof passwordChangeSchema>) => {
      return await apiRequest('/api/user/change-password', 'POST', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error changing password",
        description: error?.message || "There was a problem changing your password.",
        variant: "destructive",
      });
    }
  });
  
  // Handle profile update
  const updateProfile = useMutation({
    mutationFn: async (values: z.infer<typeof profileUpdateSchema>) => {
      return await apiRequest('/api/user/profile', 'PATCH', values);
    },
    onSuccess: (data) => {
      // Update the cache with the new user data
      queryClient.setQueryData(['/api/user'], data);
      // Also invalidate to ensure any other components refresh
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile updated",
        description: "Your account information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating profile",
        description: error?.message || "There was a problem updating your profile.",
        variant: "destructive",
      });
    }
  });
  
  // Handle theme toggle
  const handleThemeToggle = () => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };
  
  // Handle multi-currency enable
  const handleEnableMultiCurrency = () => {
    // Only allow enabling once
    if (!settings.multiCurrencyEnabled && selectedHomeCurrency) {
      const newSettings = { 
        ...settings, 
        multiCurrencyEnabled: true,
        homeCurrency: selectedHomeCurrency,
        multiCurrencyEnabledAt: new Date()
      };
      
      // Update local state
      setSettings(newSettings);
      
      // Save to database
      savePreferences.mutate(newSettings);
    }
  };
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof companyFormSchema>) => {
    saveCompanyDetails.mutate(values);
  };
  
  // Handle preferences submission
  const savePreferencesHandler = () => {
    savePreferences.mutate(settings);
  };
  
  // Logo upload mutation
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
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
      
      const updatedCompany = await response.json();
      
      // Invalidate relevant queries to refresh the UI
      await queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/companies/default'] });
      
      // Force immediate refetch to update the logo thumbnail
      await companyQuery.refetch();
      
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been uploaded successfully.",
      });
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-h-[80vh] overflow-y-auto ${
        activeTab === 'invoices' ? 'max-w-[95vw] lg:max-w-[1200px]' : 'sm:max-w-[600px]'
      }`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Configure application settings and company information
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 mb-6">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Company</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Account</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Currency</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
          </TabsList>
          
          {/* Company Details Tab */}
          <TabsContent value="company">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
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
                  
                  {/* Company Name */}
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
                  
                  {/* Address with Autocomplete */}
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
                  
                  {/* Contact Information */}
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
                  
                  {/* Additional Information */}
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
                  
                  {/* Fiscal Year Settings */}
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
                          data-testid="select-fiscal-year-month"
                        />
                        <p className="text-sm text-muted-foreground">
                          This setting affects all financial reports and determines how fiscal periods are calculated
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={saveCompanyDetails.isPending || companyQuery.isLoading || !companyQuery.data}
                  className="w-full"
                >
                  {saveCompanyDetails.isPending ? "Saving..." : "Save Company Details"}
                </Button>
              </form>
            </Form>
          </TabsContent>
          
          {/* Account Tab */}
          <TabsContent value="account">
            <div className="space-y-6">
              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} data-testid="input-current-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} data-testid="input-new-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" {...field} data-testid="input-confirm-password" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={changePassword.isPending} className="w-full" data-testid="button-change-password">
                        {changePassword.isPending ? "Changing..." : "Change Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
              
              {/* Update Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Update your account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-profile-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-first-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={profileForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-last-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button type="submit" disabled={updateProfile.isPending} className="w-full" data-testid="button-update-profile">
                        {updateProfile.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Interface</CardTitle>
                <CardDescription>Customize how the application looks and behaves</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme-toggle">Dark Mode</Label>
                    <p className="text-sm text-gray-500">Enable for reduced eye strain in low-light environments</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="theme-toggle" 
                      checked={settings.darkMode}
                      onCheckedChange={handleThemeToggle}
                    />
                    {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </div>
                </div>
                
                <Button 
                  onClick={savePreferencesHandler} 
                  disabled={savePreferences.isPending}
                  className="w-full"
                >
                  {savePreferences.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Invoice Templates</h3>
                <p className="text-sm text-muted-foreground">Choose how your invoices will look when printed or sent to customers</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
                {/* Left Column: Template Selection */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    {templates.map((template) => {
                      const Icon = template.icon;
                      const isSelected = selectedTemplate === template.id;
                      
                      return (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`w-full flex items-start gap-3 p-4 border-2 rounded-lg transition-all text-left ${
                            isSelected
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg flex-shrink-0 ${
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">{template.name}</h4>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{template.description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  <Button 
                    onClick={() => {
                      const newSettings = { ...settings, invoiceTemplate: selectedTemplate };
                      setSettings(newSettings);
                      savePreferences.mutate(newSettings);
                    }}
                    disabled={savePreferences.isPending || selectedTemplate === settings.invoiceTemplate}
                    className="w-full"
                  >
                    {savePreferences.isPending ? "Saving..." : "Save Template Selection"}
                  </Button>
                </div>

                {/* Right Column: Live Preview */}
                <div className="hidden lg:block">
                  <div className="sticky top-4">
                    <h4 className="text-sm font-semibold mb-3 text-gray-700">Preview</h4>
                    <InvoiceTemplatePreview template={selectedTemplate} />
                  </div>
                </div>

                {/* Mobile Preview */}
                <div className="lg:hidden">
                  <h4 className="text-sm font-semibold mb-3 text-gray-700">Preview</h4>
                  <InvoiceTemplatePreview template={selectedTemplate} />
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Currency Tab */}
          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Currency Settings</CardTitle>
                <CardDescription>Configure multi-currency support for your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!settings.multiCurrencyEnabled ? (
                  /* Before enabling multi-currency */
                  <>
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            Before You Enable Multi-Currency
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Once enabled, multi-currency support cannot be disabled. Your home currency will be locked and cannot be changed.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="home-currency">Select Home Currency</Label>
                        <SearchableSelect
                          items={currencyItems}
                          value={selectedHomeCurrency}
                          onValueChange={setSelectedHomeCurrency}
                          placeholder="Select your home currency"
                          searchPlaceholder="Search currencies..."
                          emptyText="No currencies found"
                          data-testid="select-home-currency"
                        />
                        <p className="text-sm text-muted-foreground">
                          This will be your company's primary currency. All reports will use this currency.
                        </p>
                      </div>
                      
                      <Button 
                        onClick={handleEnableMultiCurrency}
                        disabled={!selectedHomeCurrency}
                        className="w-full"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Enable Multi-Currency Support
                      </Button>
                    </div>
                  </>
                ) : (
                  /* After enabling multi-currency */
                  <>
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">
                            Multi-Currency Enabled
                          </p>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Your business can now process transactions in foreign currencies.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Home Currency</Label>
                        <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
                          <span className="font-medium">{settings.homeCurrency}</span>
                          <span className="text-sm text-muted-foreground">Locked</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Home currency cannot be changed after multi-currency is enabled.
                        </p>
                      </div>
                      
                      {settings.multiCurrencyEnabledAt && (
                        <div className="space-y-2">
                          <Label>Enabled On</Label>
                          <div className="p-3 border rounded-md bg-muted">
                            <span className="text-sm">
                              {new Date(settings.multiCurrencyEnabledAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users, roles, and access permissions for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Control who has access to your accounting system and what they can do.
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Invite new users to join your organization</li>
                    <li>Assign roles and permissions</li>
                    <li>Manage user accounts and access</li>
                    <li>View pending invitations</li>
                  </ul>
                </div>
                
                <Link href="/manage-users">
                  <Button className="w-full" data-testid="button-open-manage-users">
                    <Users className="mr-2 h-4 w-4" />
                    Open User Management
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}