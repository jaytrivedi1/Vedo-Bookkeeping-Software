import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format, subDays, startOfMonth } from "date-fns";
import {
  FileText,
  Calendar,
  ListChecks,
  Clock,
  Download,
  Mail,
  Eye,
  Send,
  X,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export type StatementType = 'balance_forward' | 'open_item' | 'transaction';

interface StatementConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contactType: 'customer' | 'vendor';
  contactName: string;
  contactEmail?: string;
}

interface StatementTypeOption {
  value: StatementType;
  label: string;
  icon: React.ReactNode;
  description: string;
  details: string;
  requiresDateRange: boolean;
}

type ModalView = 'config' | 'preview' | 'email';

const statementTypes: StatementTypeOption[] = [
  {
    value: 'balance_forward',
    label: 'Balance Forward',
    icon: <FileText className="h-5 w-5" />,
    description: 'Shows transactions between dates with running balance and final amount due.',
    details: 'Best for periodic statements showing activity and balance.',
    requiresDateRange: true
  },
  {
    value: 'open_item',
    label: 'Open Item',
    icon: <ListChecks className="h-5 w-5" />,
    description: 'Lists all unpaid invoices with their current balance.',
    details: 'Best for collections and showing what is currently owed.',
    requiresDateRange: false
  },
  {
    value: 'transaction',
    label: 'Transaction Statement',
    icon: <Clock className="h-5 w-5" />,
    description: 'Complete transaction history including payments and credits for a specific period.',
    details: 'Best for detailed account reconciliation.',
    requiresDateRange: true
  }
];

export default function StatementConfigModal({
  open,
  onOpenChange,
  contactId,
  contactType,
  contactName,
  contactEmail
}: StatementConfigModalProps) {
  const { toast } = useToast();
  const [view, setView] = useState<ModalView>('config');
  const [selectedType, setSelectedType] = useState<StatementType>('balance_forward');
  const [statementDate, setStatementDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Email form state
  const [recipientEmail, setRecipientEmail] = useState<string>(contactEmail || '');
  const [ccEmails, setCcEmails] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailMessage, setEmailMessage] = useState<string>('');

  const selectedOption = statementTypes.find(t => t.value === selectedType);
  const showDateRange = selectedOption?.requiresDateRange ?? true;

  // Build PDF URL for preview/download
  const buildPdfUrl = () => {
    const params = new URLSearchParams({
      contactId: contactId.toString(),
      contactType,
      type: selectedType,
      statementDate,
    });
    if (showDateRange) {
      params.append('startDate', startDate);
      params.append('endDate', endDate);
    }
    return `/api/statements/pdf?${params.toString()}`;
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        contactId,
        contactType,
        type: selectedType,
        statementDate,
        startDate: showDateRange ? startDate : undefined,
        endDate: showDateRange ? endDate : undefined,
        recipientEmail,
        ccEmails: ccEmails ? ccEmails.split(',').map(e => e.trim()) : undefined,
        subject: emailSubject || undefined,
        message: emailMessage || undefined,
      };
      return apiRequest('/api/statements/send', 'POST', payload);
    },
    onSuccess: () => {
      toast({
        title: "Statement sent",
        description: `Statement has been emailed to ${recipientEmail}`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send statement email",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setView('config');
    setRecipientEmail(contactEmail || '');
    setCcEmails('');
    setEmailSubject('');
    setEmailMessage('');
    onOpenChange(false);
  };

  const handleDownload = () => {
    window.open(buildPdfUrl(), '_blank');
    toast({
      title: "Statement generated",
      description: "Your statement PDF is being downloaded.",
    });
  };

  const handlePreview = () => {
    setView('preview');
  };

  const handleEmailView = () => {
    setRecipientEmail(contactEmail || '');
    const typeLabel = selectedOption?.label || 'Statement';
    setEmailSubject(`${typeLabel} Statement`);
    setView('email');
  };

  const handleSendEmail = () => {
    if (!recipientEmail) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  // Config View
  const renderConfigView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-slate-800">
          Create {contactType === 'customer' ? 'Customer' : 'Vendor'} Statement
        </DialogTitle>
        <DialogDescription className="text-slate-500">
          Generate a statement for <span className="font-medium text-slate-700">{contactName}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Statement Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Statement Type
          </label>
          <div className="space-y-3">
            {statementTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  selectedType === type.value
                    ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    selectedType === type.value
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300"
                  )}>
                    {selectedType === type.value && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className={cn(
                    "p-2 rounded-lg flex-shrink-0",
                    selectedType === type.value
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-slate-100 text-slate-500"
                  )}>
                    {type.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-semibold",
                      selectedType === type.value ? "text-indigo-700" : "text-slate-700"
                    )}>
                      {type.label}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {type.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {type.details}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-slate-200" />

        {/* Date Configuration */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Statement Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              The date that appears on the statement
            </p>
          </div>

          {showDateRange && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  End Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="flex-col sm:flex-row gap-2">
        <Button variant="outline" onClick={handleClose} className="border-slate-300">
          Cancel
        </Button>
        <div className="flex gap-2 flex-1 sm:flex-none">
          <Button
            variant="outline"
            onClick={handlePreview}
            className="flex-1 sm:flex-none border-slate-300"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex-1 sm:flex-none border-slate-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleEmailView}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </DialogFooter>
    </>
  );

  // Preview View
  const renderPreviewView = () => (
    <>
      <DialogHeader className="flex-row items-center gap-3 space-y-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('config')}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            Statement Preview
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {selectedOption?.label} for {contactName}
          </DialogDescription>
        </div>
      </DialogHeader>

      <div className="flex-1 -mx-6 -mb-6 mt-4">
        <iframe
          src={buildPdfUrl()}
          className="w-full h-[500px] border-0 rounded-b-lg"
          title="Statement Preview"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button variant="outline" onClick={handleDownload} className="border-slate-300">
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button
          onClick={handleEmailView}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Mail className="h-4 w-4 mr-2" />
          Send via Email
        </Button>
      </div>
    </>
  );

  // Email View
  const renderEmailView = () => (
    <>
      <DialogHeader className="flex-row items-center gap-3 space-y-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setView('config')}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <DialogTitle className="text-lg font-semibold text-slate-800">
            Send Statement via Email
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            {selectedOption?.label} for {contactName}
          </DialogDescription>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div>
          <Label htmlFor="recipientEmail" className="text-sm font-medium text-slate-700">
            To <span className="text-red-500">*</span>
          </Label>
          <Input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="recipient@example.com"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="ccEmails" className="text-sm font-medium text-slate-700">
            CC (optional)
          </Label>
          <Input
            id="ccEmails"
            type="text"
            value={ccEmails}
            onChange={(e) => setCcEmails(e.target.value)}
            placeholder="Separate multiple emails with commas"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="emailSubject" className="text-sm font-medium text-slate-700">
            Subject
          </Label>
          <Input
            id="emailSubject"
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Statement from Your Company"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="emailMessage" className="text-sm font-medium text-slate-700">
            Message (optional)
          </Label>
          <Textarea
            id="emailMessage"
            value={emailMessage}
            onChange={(e) => setEmailMessage(e.target.value)}
            placeholder="Add a personal message..."
            className="mt-1.5 min-h-[100px]"
          />
        </div>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Statement PDF will be attached automatically</span>
          </p>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => setView('config')} className="border-slate-300">
          Back
        </Button>
        <Button
          onClick={handleSendEmail}
          disabled={sendEmailMutation.isPending || !recipientEmail}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {sendEmailMutation.isPending ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Statement
            </>
          )}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "sm:max-w-[520px]",
        view === 'preview' && "sm:max-w-[700px]"
      )}>
        {view === 'config' && renderConfigView()}
        {view === 'preview' && renderPreviewView()}
        {view === 'email' && renderEmailView()}
      </DialogContent>
    </Dialog>
  );
}
