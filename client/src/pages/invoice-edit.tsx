import React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import InvoiceFormEdit from "@/components/forms/InvoiceFormEdit";
import { Transaction, LineItem } from "@shared/schema";

interface InvoiceResponse {
  transaction: Transaction;
  lineItems: LineItem[];
  ledgerEntries: any[];
}

export default function EditInvoice() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/invoice-edit/:id");
  const invoiceId = params?.id ? parseInt(params.id) : null;

  // Get transaction data including line items
  const { data, isLoading } = useQuery<InvoiceResponse>({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice data");
      return response.json();
    },
    enabled: !!invoiceId
  });

  // Navigate back to invoices after success or cancel
  const handleSuccess = () => {
    setLocation("/invoices");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading invoice data...</div>;
  }

  if (!data || data.transaction.type !== 'invoice') {
    return <div className="flex items-center justify-center h-screen">Invoice not found or invalid type</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <InvoiceFormEdit 
        invoice={data.transaction}
        lineItems={data.lineItems || []}
        onSuccess={handleSuccess} 
        onCancel={() => setLocation("/invoices")} 
      />
    </div>
  );
}