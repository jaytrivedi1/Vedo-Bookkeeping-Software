import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Check, FileText, Sparkles, LayoutTemplate, Minimize2, X, Brain, Zap, BookOpen } from "lucide-react";

interface Preferences {
  id?: number;
  invoiceTemplate?: string;
  darkMode?: boolean;
  multiCurrencyEnabled?: boolean;
  homeCurrency?: string;
  transactionLockDate?: string | Date | null;
}

interface AiCategorizationSettings {
  aiCategorizationEnabled: boolean;
  aiAutoPostEnabled: boolean;
  aiAutoPostMinConfidence: string;
  aiRuleGenerationEnabled: boolean;
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

export default function Settings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [lockDate, setLockDate] = useState<string>("");

  // Fetch preferences
  const { data: preferences, isLoading } = useQuery<Preferences>({
    queryKey: ["/api/settings/preferences"],
  });

  // Fetch AI categorization settings
  const { data: aiSettings, isLoading: isLoadingAi } = useQuery<AiCategorizationSettings>({
    queryKey: ["/api/settings/categorization"],
  });

  // Local state for AI settings
  const [localAiSettings, setLocalAiSettings] = useState<AiCategorizationSettings>({
    aiCategorizationEnabled: true,
    aiAutoPostEnabled: false,
    aiAutoPostMinConfidence: "0.95",
    aiRuleGenerationEnabled: true,
  });

  // Update local state when AI settings load
  useEffect(() => {
    if (aiSettings) {
      setLocalAiSettings(aiSettings);
    }
  }, [aiSettings]);

  // Update AI settings mutation
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
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleAiSettingChange = <K extends keyof AiCategorizationSettings>(
    key: K,
    value: AiCategorizationSettings[K]
  ) => {
    setLocalAiSettings(prev => ({ ...prev, [key]: value }));
    updateAiSettings.mutate({ [key]: value });
  };

  // Update selected template and lock date when preferences load
  useEffect(() => {
    if (preferences?.invoiceTemplate) {
      setSelectedTemplate(preferences.invoiceTemplate);
    }
    if (preferences?.transactionLockDate) {
      const date = new Date(preferences.transactionLockDate);
      setLockDate(date.toISOString().split('T')[0]);
    }
  }, [preferences?.invoiceTemplate, preferences?.transactionLockDate]);

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (template: string) => {
      return apiRequest("/api/settings/preferences", "POST", {
        invoiceTemplate: template,
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Invoice template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/preferences"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Update lock date mutation
  const updateLockDate = useMutation({
    mutationFn: async (date: string | null) => {
      return apiRequest("/api/settings/preferences", "POST", {
        transactionLockDate: date ? new Date(date) : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Transaction lock date updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/preferences"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save lock date: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    updatePreferences.mutate(templateId);
  };

  const handleLockDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setLockDate(newDate);
    updateLockDate.mutate(newDate || null);
  };

  const handleClearLockDate = () => {
    setLockDate("");
    updateLockDate.mutate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your application preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Lock Date</CardTitle>
          <CardDescription>
            Lock transactions on or before a specific date to protect closed periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lock-date">Lock Date</Label>
              <div className="flex gap-2">
                <input
                  id="lock-date"
                  type="date"
                  value={lockDate}
                  onChange={handleLockDateChange}
                  disabled={updateLockDate.isPending}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="input-lock-date"
                />
                {lockDate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearLockDate}
                    disabled={updateLockDate.isPending}
                    data-testid="button-clear-lock"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {lockDate && (
                <p className="text-sm text-amber-600">
                  Transactions on or before {new Date(lockDate).toLocaleDateString()} cannot be created or modified
                </p>
              )}
            </div>
            {updateLockDate.isPending && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Saving...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Template</CardTitle>
          <CardDescription>
            Choose a default template for all your invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate === template.id;

              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`
                    relative p-6 rounded-lg border-2 transition-all duration-200 text-left
                    ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-gray-200 hover:border-primary/50 hover:shadow-sm"
                    }
                  `}
                  data-testid={`template-option-${template.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`
                      w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
                      ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600"
                      }
                    `}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {template.name}
                        </h3>
                        {isSelected && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {updatePreferences.isPending && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

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
          {isLoadingAi ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* AI Suggestions Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    AI Categorization Suggestions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered suggestions for new merchants (only merchant name is shared)
                  </p>
                </div>
                <Switch
                  checked={localAiSettings.aiCategorizationEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiCategorizationEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>

              <Separator />

              {/* Auto-Post Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
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
                  checked={localAiSettings.aiAutoPostEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiAutoPostEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>

              {/* Confidence Threshold Slider */}
              {localAiSettings.aiAutoPostEnabled && (
                <div className="ml-6 p-4 bg-muted rounded-lg space-y-3">
                  <Label>Minimum Confidence for Auto-Post</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[parseFloat(localAiSettings.aiAutoPostMinConfidence) * 100]}
                      min={80}
                      max={99}
                      step={1}
                      onValueCommit={([value]) =>
                        handleAiSettingChange("aiAutoPostMinConfidence", (value / 100).toFixed(2))
                      }
                      className="flex-1"
                      disabled={updateAiSettings.isPending}
                    />
                    <span className="font-mono w-12 text-right">
                      {Math.round(parseFloat(localAiSettings.aiAutoPostMinConfidence) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Higher threshold = fewer auto-posts but more accuracy
                  </p>
                </div>
              )}

              <Separator />

              {/* AI Rule Generation Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Auto-Generate AI Rules
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create rules when patterns are detected (3+ similar transactions)
                  </p>
                </div>
                <Switch
                  checked={localAiSettings.aiRuleGenerationEnabled}
                  onCheckedChange={(checked) =>
                    handleAiSettingChange("aiRuleGenerationEnabled", checked)
                  }
                  disabled={updateAiSettings.isPending}
                />
              </div>

              {updateAiSettings.isPending && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Saving...
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
