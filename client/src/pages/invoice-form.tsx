import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import InvoiceForm from "@/components/forms/InvoiceForm";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceResponse {
  transaction: any;
  lineItems: any[];
  ledgerEntries: any[];
}

export default function InvoiceFormPage() {
  const [, setLocation] = useLocation();
  const [invoiceId, setInvoiceId] = useState<number | null>(null);

  // Extract invoice ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/invoices\/(\d+)\/edit/);
    if (editMatch && editMatch[1]) {
      setInvoiceId(parseInt(editMatch[1]));
    } else {
      setInvoiceId(null); // New mode
    }
  }, []);

  // Determine if we're in edit mode
  const isEditMode = invoiceId !== null;

  // Fetch invoice data when in edit mode
  const { data, isLoading, error } = useQuery<InvoiceResponse>({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  // Navigate back to invoices list
  const handleSuccess = () => {
    setLocation("/invoices");
  };

  const handleCancel = () => {
    setLocation("/invoices");
  };

  // Show loading state while fetching invoice data in edit mode
  if (isEditMode && isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
        <span className="ml-2">Loading invoice...</span>
      </div>
    );
  }

  // Show error state if invoice fetch failed
  if (isEditMode && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive">
        <p className="text-lg" data-testid="error-message">Error loading invoice: {String(error)}</p>
        <Button
          className="mt-4"
          onClick={() => setLocation("/invoices")}
          data-testid="button-back-error"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  // Show not found state if invoice doesn't exist
  if (isEditMode && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-lg" data-testid="not-found-message">Invoice not found</p>
        <Button
          className="mt-4"
          onClick={() => setLocation("/invoices")}
          data-testid="button-back-not-found"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoices
        </Button>
      </div>
    );
  }

  // Render the invoice form
  return (
    <div className="h-screen flex flex-col" data-testid={isEditMode ? "edit-invoice-page" : "new-invoice-page"}>
      <InvoiceForm
        invoice={isEditMode ? data?.transaction : undefined}
        lineItems={isEditMode ? data?.lineItems : undefined}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
}
