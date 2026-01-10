import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SearchableSelect, SearchableSelectItem } from "@/components/ui/searchable-select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsState {
  multiCurrencyEnabled: boolean;
  homeCurrency: string | null;
  multiCurrencyEnabledAt: Date | null;
}

export default function CurrencySettings() {
  const { toast } = useToast();
  const [selectedHomeCurrency, setSelectedHomeCurrency] = useState<string>("USD");

  const [settings, setSettings] = useState<SettingsState>({
    multiCurrencyEnabled: false,
    homeCurrency: null,
    multiCurrencyEnabledAt: null,
  });

  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
  });

  const currenciesQuery = useQuery({
    queryKey: ['/api/currencies'],
  });

  useEffect(() => {
    if (preferencesQuery.data && Object.keys(preferencesQuery.data).length > 0) {
      const data = preferencesQuery.data as any;
      setSettings({
        multiCurrencyEnabled: data.multiCurrencyEnabled || false,
        homeCurrency: data.homeCurrency || null,
        multiCurrencyEnabledAt: data.multiCurrencyEnabledAt ? new Date(data.multiCurrencyEnabledAt) : null,
      });

      if (data.homeCurrency) {
        setSelectedHomeCurrency(data.homeCurrency);
      }
    }
  }, [preferencesQuery.data]);

  const currencyItems: SearchableSelectItem[] = Array.isArray(currenciesQuery.data)
    ? currenciesQuery.data.map((currency: any) => ({
        value: currency.code,
        label: `${currency.code} - ${currency.name}`,
        subtitle: currency.symbol
      }))
    : [];

  const savePreferences = useMutation({
    mutationFn: async (values: Partial<SettingsState>) => {
      return await apiRequest('/api/settings/preferences', 'POST', values);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });

      const finalSettings = {
        multiCurrencyEnabled: data?.multiCurrencyEnabled ?? settings.multiCurrencyEnabled,
        homeCurrency: data?.homeCurrency ?? settings.homeCurrency,
        multiCurrencyEnabledAt: data?.multiCurrencyEnabledAt
          ? new Date(data.multiCurrencyEnabledAt)
          : settings.multiCurrencyEnabledAt,
      };

      setSettings(finalSettings);

      toast({
        title: "Currency settings saved",
        description: "Multi-currency has been enabled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving settings",
        description: error?.message || "There was a problem saving your currency settings.",
        variant: "destructive",
      });
    }
  });

  const handleEnableMultiCurrency = () => {
    if (!settings.multiCurrencyEnabled && selectedHomeCurrency) {
      savePreferences.mutate({
        multiCurrencyEnabled: true,
        homeCurrency: selectedHomeCurrency,
        multiCurrencyEnabledAt: new Date(),
      });
    }
  };

  if (preferencesQuery.isLoading || currenciesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Currency Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Configure multi-currency support for your business</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Multi-Currency Settings
          </CardTitle>
          <CardDescription>
            Enable support for transactions in multiple currencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!settings.multiCurrencyEnabled ? (
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
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be your company's primary currency. All reports will use this currency.
                  </p>
                </div>

                <Button
                  onClick={handleEnableMultiCurrency}
                  disabled={!selectedHomeCurrency || savePreferences.isPending}
                  className="w-full"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {savePreferences.isPending ? "Enabling..." : "Enable Multi-Currency Support"}
                </Button>
              </div>
            </>
          ) : (
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
    </div>
  );
}
