import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import InvoiceTemplatePreview from "@/components/settings/InvoiceTemplatePreview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Wireframe SVG thumbnails for each template
const ClassicThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Header with border */}
    <rect x="8" y="8" width="104" height="24" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1"/>
    <rect x="12" y="12" width="40" height="8" fill="#6b7280"/>
    <rect x="68" y="12" width="40" height="6" fill="#9ca3af"/>
    <rect x="68" y="20" width="40" height="3" fill="#d1d5db"/>
    {/* Bill to */}
    <rect x="8" y="38" width="30" height="3" fill="#9ca3af"/>
    <rect x="8" y="44" width="50" height="4" fill="#6b7280"/>
    <rect x="8" y="50" width="45" height="3" fill="#d1d5db"/>
    {/* Table with borders */}
    <rect x="8" y="60" width="104" height="50" fill="none" stroke="#9ca3af" strokeWidth="1"/>
    <rect x="8" y="60" width="104" height="10" fill="#e5e7eb"/>
    <line x1="8" y1="70" x2="112" y2="70" stroke="#d1d5db" strokeWidth="0.5"/>
    <line x1="8" y1="80" x2="112" y2="80" stroke="#d1d5db" strokeWidth="0.5"/>
    <line x1="8" y1="90" x2="112" y2="90" stroke="#d1d5db" strokeWidth="0.5"/>
    <line x1="8" y1="100" x2="112" y2="100" stroke="#d1d5db" strokeWidth="0.5"/>
    {/* Total box */}
    <rect x="62" y="116" width="50" height="28" fill="none" stroke="#9ca3af" strokeWidth="1"/>
    <rect x="62" y="134" width="50" height="10" fill="#374151"/>
  </svg>
);

const ModernThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Blue gradient header */}
    <rect x="0" y="0" width="120" height="32" fill="url(#modernGrad)"/>
    <defs>
      <linearGradient id="modernGrad" x1="0" y1="0" x2="120" y2="0">
        <stop offset="0%" stopColor="#0284c7"/>
        <stop offset="100%" stopColor="#0369a1"/>
      </linearGradient>
    </defs>
    <rect x="8" y="8" width="50" height="10" fill="white" opacity="0.9"/>
    <rect x="8" y="20" width="30" height="4" fill="white" opacity="0.5"/>
    {/* Info cards */}
    <rect x="8" y="40" width="32" height="20" rx="3" fill="#f3f4f6"/>
    <rect x="44" y="40" width="32" height="20" rx="3" fill="#f3f4f6"/>
    <rect x="80" y="40" width="32" height="20" rx="3" fill="#f3f4f6"/>
    {/* Striped table */}
    <rect x="8" y="68" width="104" height="10" rx="3" fill="#e0f2fe"/>
    <rect x="8" y="78" width="104" height="8" fill="white"/>
    <rect x="8" y="86" width="104" height="8" fill="#f9fafb"/>
    <rect x="8" y="94" width="104" height="8" fill="white"/>
    {/* Blue total button */}
    <rect x="62" y="120" width="50" height="14" rx="4" fill="#0284c7"/>
  </svg>
);

const MinimalThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Centered header */}
    <rect x="35" y="12" width="50" height="6" fill="#374151"/>
    <rect x="45" y="22" width="30" height="3" fill="#9ca3af"/>
    {/* Centered company info */}
    <rect x="30" y="34" width="60" height="3" fill="#d1d5db"/>
    <rect x="25" y="40" width="70" height="2" fill="#e5e7eb"/>
    {/* Divider */}
    <line x1="20" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="1"/>
    {/* Client info */}
    <rect x="30" y="58" width="20" height="2" fill="#d1d5db"/>
    <rect x="30" y="64" width="40" height="4" fill="#6b7280"/>
    <rect x="30" y="72" width="35" height="2" fill="#d1d5db"/>
    {/* Line items - minimal style */}
    <rect x="20" y="88" width="60" height="4" fill="#6b7280"/>
    <rect x="90" y="88" width="20" height="4" fill="#374151"/>
    <line x1="20" y1="98" x2="100" y2="98" stroke="#f3f4f6" strokeWidth="1"/>
    <rect x="20" y="104" width="55" height="4" fill="#6b7280"/>
    <rect x="90" y="104" width="20" height="4" fill="#374151"/>
    {/* Total */}
    <line x1="60" y1="124" x2="100" y2="124" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="60" y="130" width="20" height="6" fill="#9ca3af"/>
    <rect x="85" y="130" width="25" height="6" fill="#374151"/>
  </svg>
);

const CompactThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Two column header */}
    <rect x="8" y="8" width="50" height="4" fill="#374151"/>
    <rect x="8" y="14" width="45" height="2" fill="#d1d5db"/>
    <rect x="8" y="18" width="40" height="2" fill="#d1d5db"/>
    <rect x="72" y="8" width="40" height="8" fill="#374151"/>
    <rect x="72" y="18" width="35" height="2" fill="#9ca3af"/>
    <line x1="8" y1="26" x2="112" y2="26" stroke="#d1d5db" strokeWidth="1"/>
    {/* Bill to compact */}
    <rect x="8" y="32" width="20" height="2" fill="#9ca3af"/>
    <rect x="8" y="36" width="40" height="3" fill="#6b7280"/>
    {/* Dense table */}
    <rect x="8" y="46" width="104" height="8" fill="#f3f4f6"/>
    <rect x="8" y="46" width="104" height="44" fill="none" stroke="#d1d5db" strokeWidth="0.5"/>
    <line x1="8" y1="54" x2="112" y2="54" stroke="#e5e7eb" strokeWidth="0.5"/>
    <line x1="8" y1="62" x2="112" y2="62" stroke="#e5e7eb" strokeWidth="0.5"/>
    <line x1="8" y1="70" x2="112" y2="70" stroke="#e5e7eb" strokeWidth="0.5"/>
    <line x1="8" y1="78" x2="112" y2="78" stroke="#e5e7eb" strokeWidth="0.5"/>
    {/* Compact totals */}
    <rect x="72" y="96" width="40" height="6" fill="#f3f4f6"/>
    <rect x="72" y="102" width="40" height="6" fill="#f3f4f6"/>
    <rect x="72" y="110" width="40" height="8" fill="#374151"/>
  </svg>
);

const templates = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional bordered layout",
    Thumbnail: ClassicThumbnail,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold header with cards",
    Thumbnail: ModernThumbnail,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean centered design",
    Thumbnail: MinimalThumbnail,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Space-efficient layout",
    Thumbnail: CompactThumbnail,
  },
];

export default function InvoiceSettings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("classic");
  const [savedTemplate, setSavedTemplate] = useState<string>("classic");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Invoice Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose how your invoices will look when printed or sent to customers
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-8">
        {/* Left Column: Template Selection */}
        <div className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Design & Layout</h3>
            <p className="text-sm text-slate-500">Select a template style for your invoices</p>
          </div>

          {/* 2x2 Template Grid */}
          <div className="grid grid-cols-2 gap-4">
            {templates.map((template) => {
              const isSelected = selectedTemplate === template.id;
              const Thumbnail = template.Thumbnail;

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center group ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-500/20'
                      : 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md'
                  }`}
                >
                  {/* Selected checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div className={`w-full aspect-[3/4] mb-3 rounded-lg overflow-hidden border ${
                    isSelected ? 'border-sky-200 bg-white' : 'border-slate-100 bg-slate-50 group-hover:bg-white'
                  }`}>
                    <Thumbnail />
                  </div>

                  {/* Label */}
                  <h4 className={`font-semibold text-sm ${isSelected ? 'text-sky-700' : 'text-slate-700'}`}>
                    {template.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
                </button>
              );
            })}
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={savePreferences.isPending || selectedTemplate === savedTemplate}
            className="w-full"
          >
            {savePreferences.isPending ? "Saving..." : "Save Template Selection"}
          </Button>

          {/* Mobile Preview Button */}
          <Dialog open={mobilePreviewOpen} onOpenChange={setMobilePreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full xl:hidden">
                <Eye className="h-4 w-4 mr-2" />
                View Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invoice Preview</DialogTitle>
              </DialogHeader>
              <InvoiceTemplatePreview template={selectedTemplate} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Column: Live Preview (Desktop only) */}
        <div className="hidden xl:block">
          <div className="sticky top-6">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Live Preview</h3>
            <InvoiceTemplatePreview template={selectedTemplate} />
          </div>
        </div>
      </div>
    </div>
  );
}
