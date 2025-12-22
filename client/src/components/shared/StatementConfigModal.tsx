import { useState } from "react";
import { format, subDays, startOfMonth } from "date-fns";
import {
  FileText,
  Calendar,
  ListChecks,
  Clock,
  X
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type StatementType = 'balance_forward' | 'open_item' | 'transaction';

interface StatementConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: number;
  contactType: 'customer' | 'vendor';
  contactName: string;
}

interface StatementTypeOption {
  value: StatementType;
  label: string;
  icon: React.ReactNode;
  description: string;
  details: string;
  requiresDateRange: boolean;
}

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
  contactName
}: StatementConfigModalProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<StatementType>('balance_forward');
  const [statementDate, setStatementDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedOption = statementTypes.find(t => t.value === selectedType);
  const showDateRange = selectedOption?.requiresDateRange ?? true;

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Build query params for the statement
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

      // For now, show a toast that this feature is coming soon
      // In a full implementation, this would navigate to a statement preview or download PDF
      toast({
        title: "Statement Generated",
        description: `${selectedOption?.label} statement for ${contactName} is being prepared.`,
      });

      // TODO: Implement actual statement generation
      // navigate(`/statements/preview?${params.toString()}`);
      // or
      // window.open(`/api/statements/pdf?${params.toString()}`, '_blank');

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate statement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
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
                    {/* Radio indicator */}
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

                    {/* Icon */}
                    <div className={cn(
                      "p-2 rounded-lg flex-shrink-0",
                      selectedType === type.value
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {type.icon}
                    </div>

                    {/* Content */}
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

          {/* Divider */}
          <div className="h-px bg-slate-200" />

          {/* Date Configuration */}
          <div className="space-y-4">
            {/* Statement Date - Always shown */}
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

            {/* Date Range - Only for Balance Forward and Transaction */}
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-slate-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Statement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
