import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ChequeForm from "@/components/forms/ChequeForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ChequeResponse {
  transaction: any;
  lineItems: any[];
  ledgerEntries: any[];
}

export default function ChequeFormPage() {
  const [, navigate] = useLocation();
  const [chequeId, setChequeId] = useState<number | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/cheques\/(\d+)\/edit/);
    if (editMatch && editMatch[1]) {
      setChequeId(parseInt(editMatch[1]));
    } else {
      setChequeId(null);
    }
  }, []);

  const isEditMode = chequeId !== null;

  const { data, isLoading, error } = useQuery<ChequeResponse>({
    queryKey: ['/api/transactions', chequeId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${chequeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch cheque");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  const handleSuccess = () => {
    navigate("/transactions");
  };

  const handleCancel = () => {
    navigate("/transactions");
  };

  if (isEditMode && isLoading) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading cheque...</span>
      </div>
    );
  }

  if (isEditMode && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive" data-testid="error-state">
        <p className="text-lg">Error loading cheque: {String(error)}</p>
        <Button
          className="mt-4"
          onClick={() => navigate("/transactions")}
          data-testid="button-go-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </div>
    );
  }

  if (isEditMode && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center" data-testid="not-found-state">
        <p className="text-lg">Cheque not found</p>
        <Button
          className="mt-4"
          onClick={() => navigate("/transactions")}
          data-testid="button-go-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/transactions")}
            className="mb-4"
            data-testid="button-back-to-transactions"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
          
          <h1 className="text-2xl font-semibold text-gray-900" data-testid={isEditMode ? "heading-edit-cheque" : "heading-new-cheque"}>
            {isEditMode ? `Edit Cheque #${data?.transaction.reference || ''}` : "New Cheque"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode ? "Update the details of this cheque payment" : "Create a new cheque payment"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cheque Details</CardTitle>
            <CardDescription>
              {isEditMode ? "Modify the details of your cheque payment" : "Enter the details of your cheque payment"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChequeForm
              cheque={isEditMode ? data?.transaction : undefined}
              lineItems={isEditMode ? data?.lineItems : undefined}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
