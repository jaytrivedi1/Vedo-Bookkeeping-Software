import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface TransactionFormProps {
  onSuccess?: () => void;
}

// TransactionForm is now renamed from the prior TransactionButton component
export default function TransactionForm({ onSuccess }: TransactionFormProps) {
  const [, setLocation] = useLocation();

  // Direct navigation to invoices page where we'll handle form presentation
  const handleNewTransaction = () => {
    // Navigate to the invoices page where we can handle the form display logic
    setLocation("/invoices");
  };

  return (
    <Button 
      className="text-white bg-primary hover:bg-primary/90"
      onClick={handleNewTransaction}
    >
      <PlusIcon className="h-4 w-4 mr-2" />
      New Transaction
    </Button>
  );
}
