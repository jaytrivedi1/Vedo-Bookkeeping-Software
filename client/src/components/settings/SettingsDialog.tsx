import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Settings, Info, Languages, Moon, Sun, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MONTH_OPTIONS } from "@shared/fiscalYear";

// Define schema for company details
const companyFormSchema = z.object({
  name: z.string().min(1, {
    message: "Company name is required.",
  }),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
  website: z.string().url({
    message: "Please enter a valid URL.",
  }).optional(),
  taxId: z.string().optional(),
  fiscalYearStartMonth: z.number().min(1).max(12).optional(),
});

// Define settings for preferences
interface SettingsState {
  darkMode: boolean;
  foreignCurrency: boolean;
}

// Define props for the component
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");
  
  // Initialize state for settings
  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    foreignCurrency: false
  });
  
  // Query company settings
  const companyQuery = useQuery({
    queryKey: ['/api/settings/company'],
    enabled: open,
  });
  
  // Query user preferences
  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
    enabled: open
  });
  
  // Process preferences data when it loads
  useEffect(() => {
    if (preferencesQuery.data && Object.keys(preferencesQuery.data).length > 0) {
      const data = preferencesQuery.data as any;
      setSettings({
        darkMode: data.darkMode || false,
        foreignCurrency: data.foreignCurrency || false
      });
      
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
      address: "123 Business Street, City, State, ZIP",
      phone: "+1 (555) 123-4567",
      email: "info@yourcompany.com",
      website: "https://yourcompany.com",
      taxId: "12-3456789",
      fiscalYearStartMonth: 1,
    },
  });
  
  // Transform month options for SearchableSelect
  const monthItems: SearchableSelectItem[] = MONTH_OPTIONS.map(month => ({
    value: month.value.toString(),
    label: month.label,
    subtitle: undefined
  }));
  
  // Update form when company data is loaded
  useEffect(() => {
    if (companyQuery.data && Object.keys(companyQuery.data).length > 0) {
      const data = companyQuery.data as any;
      form.reset({
        name: data.name || "Your Company Name",
        address: data.address || "",
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
      return await apiRequest('/api/settings/company', 'POST', values);
    },
    onSuccess: () => {
      // Invalidate company settings query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/company'] });
      
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
    onSuccess: () => {
      // Invalidate preferences query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      
      toast({
        title: "Preferences saved",
        description: "Your preferences have been updated successfully.",
      });
      
      // Apply theme change immediately
      if (settings.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error saving preferences",
        description: error?.message || "There was a problem saving your preferences.",
        variant: "destructive",
      });
    }
  });
  
  // Handle theme toggle
  const handleThemeToggle = () => {
    setSettings(prev => ({ ...prev, darkMode: !prev.darkMode }));
  };
  
  // Handle foreign currency toggle
  const handleForeignCurrencyToggle = () => {
    // Only allow turning it on, never off
    if (!settings.foreignCurrency) {
      setSettings(prev => ({ ...prev, foreignCurrency: true }));
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
  
  // Upload company logo
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Handle file upload logic here
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been uploaded successfully.",
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
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
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span>Company</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span>Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span>Currency</span>
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
                      <div className="h-16 w-16 rounded-md border flex items-center justify-center bg-gray-50">
                        <Settings className="h-8 w-8 text-gray-400" />
                      </div>
                      <Button variant="outline" type="button" className="relative">
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                        Upload logo
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
                  
                  {/* Address */}
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                  disabled={saveCompanyDetails.isPending}
                  className="w-full"
                >
                  {saveCompanyDetails.isPending ? "Saving..." : "Save Company Details"}
                </Button>
              </form>
            </Form>
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
          
          {/* Currency Tab */}
          <TabsContent value="currency">
            <Card>
              <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>Configure currency options for your business</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Foreign Currency Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="currency-toggle">Multi-Currency Support</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable support for foreign currencies 
                      <span className="text-red-500 ml-1 font-medium">(cannot be disabled once enabled)</span>
                    </p>
                  </div>
                  <Switch 
                    id="currency-toggle" 
                    checked={settings.foreignCurrency}
                    onCheckedChange={handleForeignCurrencyToggle}
                    disabled={settings.foreignCurrency}
                  />
                </div>
                
                {/* Default Currency Selection - shown only when foreign currency is enabled */}
                {settings.foreignCurrency && (
                  <div className="pt-4">
                    <p className="text-sm font-medium mb-2">Default Currency</p>
                    <div className="grid grid-cols-4 gap-2">
                      {["USD", "CAD", "GBP", "EUR"].map(currency => (
                        <Button
                          key={currency}
                          variant="outline"
                          className="focus:ring-2 focus:ring-primary"
                          // Currently only visual, could be connected to state
                          data-state={currency === "CAD" ? "selected" : "idle"}
                        >
                          {currency}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={savePreferencesHandler} 
                  disabled={savePreferences.isPending}
                  className="w-full"
                >
                  {savePreferences.isPending ? "Saving..." : "Save Currency Settings"}
                </Button>
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