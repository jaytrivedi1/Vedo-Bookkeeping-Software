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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Sun, Moon, Lock, Calendar as CalendarIcon, X, Brain, Sparkles, Zap } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SettingsState {
  darkMode: boolean;
  transactionLockDate: Date | null;
}

interface AiCategorizationSettings {
  aiCategorizationEnabled: boolean;
  aiAutoPostEnabled: boolean;
  aiAutoPostMinConfidence: string;
  aiRuleGenerationEnabled: boolean;
}

export default function PreferencesSettings() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<SettingsState>({
    darkMode: false,
    transactionLockDate: null,
  });

  const [aiSettings, setAiSettings] = useState<AiCategorizationSettings>({
    aiCategorizationEnabled: true,
    aiAutoPostEnabled: false,
    aiAutoPostMinConfidence: "0.95",
    aiRuleGenerationEnabled: true,
  });

  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
  });

  const aiSettingsQuery = useQuery<AiCategorizationSettings>({
    queryKey: ['/api/settings/categorization'],
  });

  useEffect(() => {
    if (preferencesQuery.data && Object.keys(preferencesQuery.data).length > 0) {
      const data = preferencesQuery.data as any;
      setSettings({
        darkMode: data.darkMode || false,
        transactionLockDate: data.transactionLockDate ? new Date(data.transactionLockDate) : null,
      });

      if (data.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [preferencesQuery.data]);

  useEffect(() => {
    if (aiSettingsQuery.data) {
      setAiSettings(aiSettingsQuery.data);
    }
  }, [aiSettingsQuery.data]);

  const savePreferences = useMutation({
    mutationFn: async (values: Partial<SettingsState>) => {
      return await apiRequest('/api/settings/preferences', 'POST', values);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/preferences'] });

      if (data?.darkMode !== undefined) {
        if (data.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
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

  const updateAiSettings = useMutation({
    mutationFn: async (updates: Partial<AiCategorizationSettings>) => {
      return apiRequest("/api/settings/categorization", "PATCH", updates);
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "AI categorization settings updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/categorization"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save AI settings",
        variant: "destructive",
      });
    },
  });

  const handleThemeToggle = () => {
    const newDarkMode = !settings.darkMode;
    setSettings(prev => ({ ...prev, darkMode: newDarkMode }));
    savePreferences.mutate({ darkMode: newDarkMode });
  };

  const handleLockDateChange = (date: Date | undefined) => {
    const newDate = date || null;
    setSettings(prev => ({ ...prev, transactionLockDate: newDate }));
    savePreferences.mutate({ transactionLockDate: newDate });
  };

  const handleAiSettingChange = (key: keyof AiCategorizationSettings, value: boolean | string) => {
    const newSettings = { ...aiSettings, [key]: value };
    setAiSettings(newSettings);
    updateAiSettings.mutate({ [key]: value });
  };

  if (preferencesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Preferences</h2>
        <p className="text-sm text-slate-500 mt-1">Customize how the application looks and behaves</p>
      </div>

      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Interface</CardTitle>
          <CardDescription>Customize how the application looks</CardDescription>
        </CardHeader>
        <CardContent>
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
                disabled={savePreferences.isPending}
              />
              {settings.darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Lock Date Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Transaction Lock Date
          </CardTitle>
          <CardDescription>
            Prevent changes to transactions on or before this date to protect closed accounting periods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Lock transactions through</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {settings.transactionLockDate
                      ? format(settings.transactionLockDate, "PPP")
                      : "No lock date set"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={settings.transactionLockDate || undefined}
                    onSelect={handleLockDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {settings.transactionLockDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleLockDateChange(undefined)}
                  title="Clear lock date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {settings.transactionLockDate
                ? `Transactions dated ${format(settings.transactionLockDate, "MMMM d, yyyy")} or earlier cannot be created, edited, or deleted.`
                : "Set a date to prevent modifications to transactions in closed periods."
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Categorization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Categorization
          </CardTitle>
          <CardDescription>
            Configure how AI assists with bank transaction categorization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {aiSettingsQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* AI Suggestions Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Categorization Suggestions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered suggestions for new merchants (only merchant name is shared)
                  </p>
                </div>
                <Switch
                  checked={aiSettings.aiCategorizationEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiCategorizationEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>

              <Separator />

              {/* Auto-Post Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Auto-Post High Confidence Matches
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically categorize transactions when confidence is above threshold
                  </p>
                  <p className="text-xs text-amber-600">
                    Only applies to learned patterns, never to new AI suggestions
                  </p>
                </div>
                <Switch
                  checked={aiSettings.aiAutoPostEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiAutoPostEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>

              {/* Confidence Threshold Slider */}
              {aiSettings.aiAutoPostEnabled && (
                <div className="ml-6 p-4 bg-muted rounded-lg space-y-3">
                  <Label>Minimum Confidence for Auto-Post</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[parseFloat(aiSettings.aiAutoPostMinConfidence) * 100]}
                      min={80}
                      max={99}
                      step={1}
                      onValueCommit={([value]) =>
                        handleAiSettingChange("aiAutoPostMinConfidence", (value / 100).toFixed(2))
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">
                      {Math.round(parseFloat(aiSettings.aiAutoPostMinConfidence) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher values require more consistent categorization history before auto-posting
                  </p>
                </div>
              )}

              <Separator />

              {/* AI Rule Generation Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-green-500" />
                    AI Rule Generation
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create rules when merchants are categorized consistently 3+ times
                  </p>
                </div>
                <Switch
                  checked={aiSettings.aiRuleGenerationEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiRuleGenerationEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
