import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import InvoiceFormEdit from "../components/forms/InvoiceFormEdit";
import { Loader2 } from "lucide-react";

interface InvoiceResponse {
  transaction: any;
  lineItems: any[];
  ledgerEntries: any[];
}

export default function EditInvoice() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const invoiceId = params.id;

  // Fetch invoice data
  const { data, isLoading, error } = useQuery<InvoiceResponse>({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading invoice...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive">
        <p className="text-lg">Error loading invoice: {String(error)}</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => setLocation("/invoices")}
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-lg">Invoice not found</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => setLocation("/invoices")}
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="h-full">
      <InvoiceFormEdit
        invoice={data.transaction}
        lineItems={data.lineItems}
        onSuccess={() => setLocation("/invoices")}
        onCancel={() => setLocation("/invoices")}
      />
    </div>
  );
}