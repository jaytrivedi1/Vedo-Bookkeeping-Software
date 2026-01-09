import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Save,
  AlertCircle,
} from "lucide-react";

interface FirmData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  isActive: boolean;
}

export default function FirmSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  // Fetch firm details
  const { data: firm, isLoading } = useQuery<FirmData>({
    queryKey: ["/api/firms", user?.firmId],
    queryFn: async () => {
      const res = await fetch(`/api/firms/${user?.firmId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch firm");
      return res.json();
    },
    enabled: !!user?.firmId,
  });

  // Update form when firm data loads
  useEffect(() => {
    if (firm) {
      setFormData({
        name: firm.name || "",
        email: firm.email || "",
        phone: firm.phone || "",
        website: firm.website || "",
        address: firm.address || "",
        city: firm.city || "",
        state: firm.state || "",
        zipCode: firm.zipCode || "",
        country: firm.country || "",
      });
    }
  }, [firm]);

  // Update firm mutation
  const updateFirm = useMutation({
    mutationFn: async (data: Partial<FirmData>) => {
      return apiRequest(`/api/firms/${user?.firmId}`, 'PATCH', data);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your firm settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/firms", user?.firmId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFirm.mutate({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      website: formData.website || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zipCode: formData.zipCode || null,
      country: formData.country || null,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Firm Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage your accounting firm's profile and contact information
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your firm's identity and primary contact details
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Firm Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Your Accounting Firm"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    Email Address
                  </div>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="contact@yourfirm.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    Phone Number
                  </div>
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  Website
                </div>
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://www.yourfirm.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <MapPin className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Address</CardTitle>
                <CardDescription>
                  Your firm's physical location
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="123 Main Street, Suite 100"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="New York"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                  placeholder="NY"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleChange("zipCode", e.target.value)}
                  placeholder="10001"
                />
              </div>

              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  placeholder="United States"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateFirm.isPending}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {updateFirm.isPending ? (
              <>
                <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </form>

      <Separator className="my-8" />

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your firm account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-100 rounded-lg bg-red-50/50">
            <div>
              <p className="font-medium text-slate-900">Deactivate Firm</p>
              <p className="text-sm text-slate-500">
                This will deactivate your firm and remove access to all client companies.
              </p>
            </div>
            <Button variant="destructive" disabled>
              Deactivate
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
