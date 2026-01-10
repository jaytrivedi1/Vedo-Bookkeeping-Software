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
const ProfessionalThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Header - logo left, invoice right */}
    <rect x="8" y="10" width="12" height="12" rx="2" fill="#e5e7eb"/>
    <rect x="24" y="10" width="35" height="5" fill="#374151"/>
    <rect x="24" y="18" width="50" height="3" fill="#d1d5db"/>
    <rect x="75" y="8" width="37" height="8" fill="#374151"/>
    <rect x="85" y="18" width="27" height="3" fill="#9ca3af"/>
    <rect x="85" y="23" width="27" height="3" fill="#d1d5db"/>
    {/* Divider */}
    <line x1="8" y1="34" x2="112" y2="34" stroke="#e5e7eb" strokeWidth="1"/>
    {/* Bill to */}
    <rect x="8" y="42" width="25" height="3" fill="#9ca3af"/>
    <rect x="8" y="48" width="45" height="4" fill="#6b7280"/>
    <rect x="8" y="55" width="40" height="3" fill="#d1d5db"/>
    {/* Table header */}
    <rect x="8" y="68" width="104" height="2" fill="#e5e7eb"/>
    <rect x="8" y="66" width="40" height="3" fill="#9ca3af"/>
    {/* Table rows with alternating */}
    <rect x="8" y="76" width="104" height="10" fill="white"/>
    <rect x="8" y="86" width="104" height="10" fill="#f9fafb"/>
    <rect x="8" y="96" width="104" height="10" fill="white"/>
    {/* Totals */}
    <rect x="68" y="116" width="44" height="3" fill="#d1d5db"/>
    <rect x="68" y="122" width="44" height="3" fill="#d1d5db"/>
    <line x1="68" y1="128" x2="112" y2="128" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="68" y="132" width="44" height="5" fill="#374151"/>
    {/* Footer line */}
    <line x1="8" y1="148" x2="112" y2="148" stroke="#f3f4f6" strokeWidth="1"/>
  </svg>
);

const BoldThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Top accent bar */}
    <rect x="0" y="0" width="120" height="4" fill="#1f2937"/>
    {/* Large INVOICE text */}
    <rect x="8" y="14" width="55" height="10" fill="#1f2937"/>
    {/* Pills */}
    <rect x="8" y="30" width="30" height="8" rx="4" fill="#f3f4f6"/>
    <rect x="42" y="30" width="40" height="8" rx="4" fill="#f3f4f6"/>
    {/* Company info right */}
    <rect x="80" y="14" width="32" height="5" fill="#6b7280"/>
    <rect x="85" y="22" width="27" height="3" fill="#d1d5db"/>
    {/* Two info cards */}
    <rect x="8" y="46" width="50" height="28" rx="4" fill="#f9fafb"/>
    <rect x="62" y="46" width="50" height="28" rx="4" fill="#f9fafb"/>
    {/* Dark table header */}
    <rect x="8" y="82" width="104" height="10" rx="3" fill="#1f2937"/>
    {/* Table rows */}
    <rect x="8" y="92" width="104" height="10" fill="white"/>
    <rect x="8" y="102" width="104" height="10" fill="#f9fafb"/>
    <rect x="8" y="112" width="104" height="10" fill="white"/>
    {/* Dark total button */}
    <rect x="56" y="132" width="56" height="14" rx="4" fill="#1f2937"/>
  </svg>
);

const ElegantThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Centered header */}
    <rect x="40" y="12" width="40" height="3" fill="#9ca3af"/>
    <rect x="35" y="20" width="50" height="6" fill="#374151"/>
    <rect x="45" y="30" width="30" height="3" fill="#d1d5db"/>
    {/* Thin divider */}
    <line x1="20" y1="42" x2="100" y2="42" stroke="#e5e7eb" strokeWidth="1"/>
    {/* Two column layout */}
    <rect x="15" y="50" width="20" height="2" fill="#d1d5db"/>
    <rect x="15" y="56" width="35" height="4" fill="#6b7280"/>
    <rect x="15" y="64" width="30" height="2" fill="#9ca3af"/>
    <rect x="75" y="50" width="20" height="2" fill="#d1d5db"/>
    <rect x="75" y="56" width="30" height="3" fill="#6b7280"/>
    <rect x="75" y="64" width="30" height="3" fill="#6b7280"/>
    {/* Line items - elegant style */}
    <line x1="15" y1="80" x2="105" y2="80" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="15" y="86" width="50" height="4" fill="#6b7280"/>
    <rect x="15" y="92" width="30" height="2" fill="#d1d5db"/>
    <rect x="90" y="88" width="15" height="4" fill="#374151"/>
    <line x1="15" y1="100" x2="105" y2="100" stroke="#f3f4f6" strokeWidth="1"/>
    <rect x="15" y="106" width="45" height="4" fill="#6b7280"/>
    <rect x="90" y="108" width="15" height="4" fill="#374151"/>
    {/* Totals with dotted lines */}
    <rect x="60" y="124" width="20" height="3" fill="#9ca3af"/>
    <line x1="82" y1="126" x2="100" y2="126" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2,2"/>
    <rect x="102" y="124" width="10" height="3" fill="#6b7280"/>
    <line x1="60" y1="134" x2="112" y2="134" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="60" y="138" width="15" height="4" fill="#6b7280"/>
    <rect x="98" y="138" width="14" height="5" fill="#374151"/>
  </svg>
);

const SimpleThumbnail = () => (
  <svg viewBox="0 0 120 156" className="w-full h-full" fill="none">
    {/* Simple header */}
    <rect x="8" y="10" width="40" height="6" fill="#374151"/>
    <rect x="8" y="20" width="30" height="3" fill="#9ca3af"/>
    {/* Company right */}
    <rect x="75" y="10" width="37" height="4" fill="#6b7280"/>
    <rect x="80" y="18" width="32" height="2" fill="#d1d5db"/>
    <rect x="80" y="23" width="32" height="2" fill="#d1d5db"/>
    {/* Dates row */}
    <rect x="8" y="36" width="35" height="3" fill="#d1d5db"/>
    <rect x="50" y="36" width="35" height="3" fill="#d1d5db"/>
    {/* Bill to */}
    <rect x="8" y="48" width="20" height="2" fill="#9ca3af"/>
    <rect x="8" y="54" width="45" height="4" fill="#6b7280"/>
    <rect x="8" y="61" width="55" height="2" fill="#d1d5db"/>
    <line x1="8" y1="70" x2="112" y2="70" stroke="#f3f4f6" strokeWidth="1"/>
    {/* Simple table */}
    <rect x="8" y="78" width="30" height="2" fill="#9ca3af"/>
    <rect x="85" y="78" width="15" height="2" fill="#9ca3af"/>
    <line x1="8" y1="84" x2="112" y2="84" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="8" y="90" width="55" height="3" fill="#6b7280"/>
    <rect x="95" y="90" width="17" height="3" fill="#6b7280"/>
    <rect x="8" y="100" width="50" height="3" fill="#6b7280"/>
    <rect x="95" y="100" width="17" height="3" fill="#6b7280"/>
    <rect x="8" y="110" width="45" height="3" fill="#6b7280"/>
    <rect x="95" y="110" width="17" height="3" fill="#6b7280"/>
    {/* Totals */}
    <rect x="70" y="124" width="20" height="3" fill="#9ca3af"/>
    <rect x="100" y="124" width="12" height="3" fill="#6b7280"/>
    <line x1="70" y1="132" x2="112" y2="132" stroke="#e5e7eb" strokeWidth="1"/>
    <rect x="70" y="136" width="15" height="4" fill="#6b7280"/>
    <rect x="98" y="136" width="14" height="4" fill="#374151"/>
  </svg>
);

const templates = [
  {
    id: "professional",
    name: "Professional",
    description: "Clean corporate style",
    Thumbnail: ProfessionalThumbnail,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Strong visual impact",
    Thumbnail: BoldThumbnail,
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Refined premium feel",
    Thumbnail: ElegantThumbnail,
  },
  {
    id: "simple",
    name: "Simple",
    description: "Clean and functional",
    Thumbnail: SimpleThumbnail,
  },
];

export default function InvoiceSettings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("professional");
  const [savedTemplate, setSavedTemplate] = useState<string>("professional");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  const preferencesQuery = useQuery({
    queryKey: ['/api/settings/preferences'],
  });

  useEffect(() => {
    if (preferencesQuery.data) {
      const data = preferencesQuery.data as any;
      const template = data.invoiceTemplate || "professional";
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
