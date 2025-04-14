import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import ExpenseForm from "@/components/forms/ExpenseForm";
import JournalEntryForm from "@/components/forms/JournalEntryForm";
import DepositForm from "@/components/forms/DepositForm";

interface TransactionFormProps {
  onSuccess?: () => void;
}

type TransactionType = "invoice" | "expense" | "journal_entry" | "deposit";

export default function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("invoice");
  const { toast } = useToast();

  // Close form and optionally refresh data
  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) {
      onSuccess();
    }
    
    toast({
      title: "Success",
      description: `${transactionType.charAt(0).toUpperCase() + transactionType.slice(1).replace('_', ' ')} created successfully.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-white bg-primary hover:bg-primary/90">
          <PlusIcon className="h-4 w-4 mr-2" />
          New Transaction
        </Button>
      </DialogTrigger>
      
      {/* Remove DialogContent and show forms in full screen for Invoice */}
      {open && transactionType === "invoice" ? (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <InvoiceForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
        </div>
      ) : (
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>
              Create a new transaction of your chosen type.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as TransactionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="journal_entry">Journal Entry</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {transactionType === "expense" && (
            <ExpenseForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
          )}
          
          {transactionType === "journal_entry" && (
            <JournalEntryForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
          )}
          
          {transactionType === "deposit" && (
            <DepositForm onSuccess={handleSuccess} onCancel={() => setOpen(false)} />
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
