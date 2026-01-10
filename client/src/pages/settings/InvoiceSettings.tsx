import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Sparkles, Minimize2, LayoutTemplate, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import InvoiceTemplatePreview from "@/components/settings/InvoiceTemplatePreview";

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

export default function InvoiceSettings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [savedTemplate, setSavedTemplate] = useState<string>("classic");

  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      const data = preferencesQuery.data as any;
      const template = data.invoiceTemplate || "classic";
      setSelectedTemplate(template);
      setSavedTemplate(template);
    }
  }, [preferencesQuery.data]);

  const savePreferences = useMutation({
    mutationFn: async (template: string) => {
      return await apiRequest('/api/settings/preferences', 'POST', { invoiceTemplate: template });
    },
    onSuccess: (_, template) => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
      setSavedTemplate(template);
      toast({
        title: "Template saved",
        description: "Your invoice template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving template",
        description: error?.message || "There was a problem saving your template selection.",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    savePreferences.mutate(selectedTemplate);
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
        <h2 className="text-xl font-semibold text-slate-900">Invoice Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Choose how your invoices will look when printed or sent to customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Left Column: Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Templates</CardTitle>
            <CardDescription>
              Select a template style for your invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              onClick={handleSave}
              disabled={savePreferences.isPending || selectedTemplate === savedTemplate}
              className="w-full"
            >
              {savePreferences.isPending ? "Saving..." : "Save Template Selection"}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Live Preview */}
        <div className="hidden lg:block">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceTemplatePreview template={selectedTemplate} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile Preview */}
      <div className="lg:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceTemplatePreview template={selectedTemplate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
