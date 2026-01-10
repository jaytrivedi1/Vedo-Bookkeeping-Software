import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Bell,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  ChevronDown,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Template types
type TemplateType = "invoice" | "reminder_before" | "reminder_due" | "reminder_overdue";

interface EmailTemplate {
  id: TemplateType;
  name: string;
  description: string;
  icon: "mail" | "bell";
  isReminder: boolean;
  defaultDays?: number;
  defaultTiming?: "before" | "after";
  subject: string;
  body: string;
  enabled: boolean;
}

// Default templates
const defaultTemplates: EmailTemplate[] = [
  {
    id: "invoice",
    name: "Invoice Email",
    description: "Sent when delivering an invoice",
    icon: "mail",
    isReminder: false,
    subject: "Invoice {{Invoice Number}} from {{Company Name}}",
    body: `Hi {{Customer Name}},

Please find attached invoice {{Invoice Number}} for {{Balance Due}}.

Payment is due by {{Due Date}}.

You can pay online using this link: {{Payment Link}}

Thank you for your business!

Best regards,
{{Company Name}}`,
    enabled: true,
  },
  {
    id: "reminder_before",
    name: "Upcoming Due Reminder",
    description: "Sent before invoice is due",
    icon: "bell",
    isReminder: true,
    defaultDays: 3,
    defaultTiming: "before",
    subject: "Reminder: Invoice {{Invoice Number}} due in {{Days Until Due}} days",
    body: `Hi {{Customer Name}},

This is a friendly reminder that invoice {{Invoice Number}} for {{Balance Due}} is due on {{Due Date}}.

Please ensure payment is made by the due date to avoid any late fees.

Pay online: {{Payment Link}}

Thank you!
{{Company Name}}`,
    enabled: true,
  },
  {
    id: "reminder_due",
    name: "Due Date Reminder",
    description: "Sent on the due date",
    icon: "bell",
    isReminder: true,
    defaultDays: 0,
    defaultTiming: "before",
    subject: "Invoice {{Invoice Number}} is due today",
    body: `Hi {{Customer Name}},

Invoice {{Invoice Number}} for {{Balance Due}} is due today.

Please make your payment at your earliest convenience.

Pay now: {{Payment Link}}

Thank you,
{{Company Name}}`,
    enabled: true,
  },
  {
    id: "reminder_overdue",
    name: "Overdue Reminder",
    description: "Sent after invoice is overdue",
    icon: "bell",
    isReminder: true,
    defaultDays: 7,
    defaultTiming: "after",
    subject: "Overdue: Invoice {{Invoice Number}} - {{Days Overdue}} days past due",
    body: `Hi {{Customer Name}},

Invoice {{Invoice Number}} for {{Balance Due}} was due on {{Due Date}} and is now {{Days Overdue}} days overdue.

Please arrange payment as soon as possible to avoid any additional fees or service interruption.

Pay now: {{Payment Link}}

If you have already made this payment, please disregard this notice.

Thank you,
{{Company Name}}`,
    enabled: false,
  },
];

// Available variables for insertion
const availableVariables = [
  { key: "{{Customer Name}}", label: "Customer Name" },
  { key: "{{Invoice Number}}", label: "Invoice Number" },
  { key: "{{Due Date}}", label: "Due Date" },
  { key: "{{Balance Due}}", label: "Balance Due" },
  { key: "{{Payment Link}}", label: "Payment Link" },
  { key: "{{Company Name}}", label: "Company Name" },
  { key: "{{Days Until Due}}", label: "Days Until Due" },
  { key: "{{Days Overdue}}", label: "Days Overdue" },
];

// Sample data for preview
const sampleData: Record<string, string> = {
  "{{Customer Name}}": "Acme Corporation",
  "{{Invoice Number}}": "INV-2025-001",
  "{{Due Date}}": "January 25, 2025",
  "{{Balance Due}}": "$4,752.00",
  "{{Payment Link}}": "https://pay.example.com/inv-001",
  "{{Company Name}}": "Your Company",
  "{{Days Until Due}}": "3",
  "{{Days Overdue}}": "7",
};

export default function EmailSettings() {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("invoice");
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const currentTemplate = templates.find((t) => t.id === selectedTemplate)!;

  // Update template
  const updateTemplate = (field: keyof EmailTemplate, value: any) => {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplate ? { ...t, [field]: value } : t
      )
    );
    setHasChanges(true);
  };

  // Insert variable at cursor position
  const insertVariable = (variable: string) => {
    if (bodyRef.current) {
      const start = bodyRef.current.selectionStart;
      const end = bodyRef.current.selectionEnd;
      const currentBody = currentTemplate.body;
      const newBody =
        currentBody.substring(0, start) + variable + currentBody.substring(end);
      updateTemplate("body", newBody);

      // Restore cursor position after variable
      setTimeout(() => {
        if (bodyRef.current) {
          const newPosition = start + variable.length;
          bodyRef.current.setSelectionRange(newPosition, newPosition);
          bodyRef.current.focus();
        }
      }, 0);
    }
  };

  // Render preview with sample data
  const renderPreview = (text: string) => {
    let result = text;
    Object.entries(sampleData).forEach(([key, value]) => {
      result = result.replace(new RegExp(key.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    return result;
  };

  // Reset to default
  const resetToDefault = () => {
    const defaultTemplate = defaultTemplates.find((t) => t.id === selectedTemplate);
    if (defaultTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === selectedTemplate ? { ...defaultTemplate } : t))
      );
      setHasChanges(true);
      toast({
        title: "Template reset",
        description: "Template has been reset to default.",
      });
    }
  };

  // Save templates
  const handleSave = () => {
    // In a real implementation, this would save to the API
    toast({
      title: "Templates saved",
      description: "Your email templates have been updated successfully.",
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Emails & Reminders</h2>
          <p className="text-sm text-slate-500 mt-1">
            Customize email templates and automated payment reminders
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left Sidebar - Template List */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-3">
            Templates
          </h3>
          {templates.map((template) => {
            const isSelected = selectedTemplate === template.id;
            const Icon = template.icon === "mail" ? Mail : Bell;

            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  isSelected
                    ? "bg-sky-50 text-sky-700"
                    : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    isSelected ? "bg-sky-100" : "bg-slate-100"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-sky-600" : "text-slate-500"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "font-medium text-sm",
                        isSelected ? "text-sky-700" : "text-slate-700"
                      )}
                    >
                      {template.name}
                    </span>
                    {template.isReminder && (
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          template.enabled ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {template.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* Automation Note */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Tip:</span> Enable or
              disable reminder emails using the toggle in the editor panel.
            </p>
          </div>
        </div>

        {/* Right Panel - Editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Editor Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentTemplate.icon === "mail" ? (
                <Mail className="h-5 w-5 text-slate-400" />
              ) : (
                <Bell className="h-5 w-5 text-slate-400" />
              )}
              <div>
                <h3 className="font-semibold text-slate-900">
                  {currentTemplate.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {currentTemplate.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Reset Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToDefault}
                className="text-slate-500"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
              {/* Preview Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-1" />
                    Edit
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Reminder Toggle & Timing */}
          {currentTemplate.isReminder && (
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={currentTemplate.enabled}
                    onCheckedChange={(checked) =>
                      updateTemplate("enabled", checked)
                    }
                  />
                  <span className="text-sm font-medium text-slate-700">
                    {currentTemplate.enabled
                      ? "Reminder enabled"
                      : "Reminder disabled"}
                  </span>
                </div>

                {currentTemplate.enabled && currentTemplate.id !== "reminder_due" && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span>Send</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <span className="font-medium">
                            {currentTemplate.defaultDays}
                          </span>
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {[1, 2, 3, 5, 7, 14, 30].map((days) => (
                          <DropdownMenuItem
                            key={days}
                            onClick={() => updateTemplate("defaultDays", days)}
                          >
                            {days} {days === 1 ? "day" : "days"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span>days</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <span className="font-medium">
                            {currentTemplate.defaultTiming === "before"
                              ? "before"
                              : "after"}
                          </span>
                          <ChevronDown className="h-3 w-3 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => updateTemplate("defaultTiming", "before")}
                        >
                          before
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateTemplate("defaultTiming", "after")}
                        >
                          after
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span>due date</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editor Content */}
          <div className="p-6">
            {showPreview ? (
              /* Preview Mode */
              <div className="space-y-4">
                <div className="pb-4 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    Subject
                  </p>
                  <p className="text-lg font-medium text-slate-900">
                    {renderPreview(currentTemplate.subject)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                    Message
                  </p>
                  <div className="bg-slate-50 rounded-xl p-6 font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {renderPreview(currentTemplate.body)}
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Subject Line - Ghost Input */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    value={currentTemplate.subject}
                    onChange={(e) => updateTemplate("subject", e.target.value)}
                    className="w-full text-lg font-medium text-slate-900 bg-transparent border-0 border-b-2 border-transparent hover:border-slate-200 focus:border-sky-500 focus:ring-0 px-0 py-2 transition-colors placeholder:text-slate-300"
                    placeholder="Enter email subject..."
                  />
                </div>

                {/* Variable Pills */}
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    Insert Variable
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {availableVariables.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => insertVariable(variable.key)}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full hover:bg-sky-100 hover:text-sky-700 transition-colors"
                      >
                        {variable.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body Editor */}
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 block">
                    Email Body
                  </label>
                  <textarea
                    ref={bodyRef}
                    value={currentTemplate.body}
                    onChange={(e) => updateTemplate("body", e.target.value)}
                    rows={12}
                    className="w-full bg-slate-50 border-0 rounded-xl p-4 text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 resize-none font-sans leading-relaxed"
                    placeholder="Write your email content here..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Editor Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Variables like <code className="bg-white px-1.5 py-0.5 rounded text-sky-600">{"{{Customer Name}}"}</code> will
              be automatically replaced with actual values when the email is sent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
