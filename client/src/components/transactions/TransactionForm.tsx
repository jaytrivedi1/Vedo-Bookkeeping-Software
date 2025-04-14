import React from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

interface TransactionFormProps {
  onSuccess?: () => void;
}

// A completely new approach - instead of using a dialog, we're now using direct navigation
export default function TransactionButton({ onSuccess }: TransactionFormProps) {
  const [, setLocation] = useLocation();

  // Directly navigate to invoice creation page
  const handleNewTransaction = () => {
    setLocation("/invoices/new");
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
