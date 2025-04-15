import React from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import InvoiceFormEdit from "@/components/forms/InvoiceFormEdit";
import { Transaction, LineItem } from "@shared/schema";

export default function EditInvoice() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/invoice-edit/:id");
  const invoiceId = params?.id ? parseInt(params.id) : null;

  // Get transaction data and line items
  const { data: transaction, isLoading: transactionLoading } = useQuery<Transaction>({
    queryKey: ['/api/transactions', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await fetch(`/api/transactions/${invoiceId}`);
      if (!response.ok) throw new Error("Failed to fetch invoice");
      return response.json();
    },
    enabled: !!invoiceId
  });

  const { data: lineItems, isLoading: lineItemsLoading } = useQuery<LineItem[]>({
    queryKey: ['/api/transactions', invoiceId, 'line-items'],
    queryFn: async () => {
      if (!invoiceId) return [];
      const response = await fetch(`/api/transactions/${invoiceId}/line-items`);
      if (!response.ok) throw new Error("Failed to fetch line items");
      return response.json();
    },
    enabled: !!invoiceId
  });

  // Navigate back to invoices after success or cancel
  const handleSuccess = () => {
    setLocation("/invoices");
  };

  if (transactionLoading || lineItemsLoading) {
    return <div className="flex items-center justify-center h-screen">Loading invoice data...</div>;
  }

  if (!transaction || transaction.type !== 'invoice') {
    return <div className="flex items-center justify-center h-screen">Invoice not found or invalid type</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <InvoiceFormEdit 
        invoice={transaction}
        lineItems={lineItems || []}
        onSuccess={handleSuccess} 
        onCancel={() => setLocation("/invoices")} 
      />
    </div>
  );
}