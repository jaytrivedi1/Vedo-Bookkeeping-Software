import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ExchangeRateUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromCurrency: string;
  toCurrency: string;
  oldRate: number;
  newRate: number;
  date: Date;
  onConfirm: (updateScope: 'transaction_only' | 'all_on_date') => void;
}

export function ExchangeRateUpdateDialog({
  open,
  onOpenChange,
  fromCurrency,
  toCurrency,
  oldRate,
  newRate,
  date,
  onConfirm
}: ExchangeRateUpdateDialogProps) {
  const dateStr = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-exchange-rate-update">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Update Exchange Rate
          </DialogTitle>
          <DialogDescription>
            You're changing the exchange rate for {fromCurrency} to {toCurrency}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500">Previous Rate</div>
              <div className="text-lg font-semibold">{oldRate.toFixed(6)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">New Rate</div>
              <div className="text-lg font-semibold text-blue-600">{newRate.toFixed(6)}</div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-900 dark:text-amber-100">
              Do you want to update the exchange rate for:
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button
            onClick={() => {
              onConfirm('transaction_only');
              onOpenChange(false);
            }}
            className="w-full"
            data-testid="button-update-transaction-only"
          >
            This Transaction Only
          </Button>
          <Button
            onClick={() => {
              onConfirm('all_on_date');
              onOpenChange(false);
            }}
            variant="outline"
            className="w-full"
            data-testid="button-update-all-on-date"
          >
            All Transactions on {dateStr}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full"
            data-testid="button-cancel-update"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
