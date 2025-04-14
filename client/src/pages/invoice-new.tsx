import React from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import { useLocation } from "wouter";

export default function NewInvoice() {
  const [, setLocation] = useLocation();

  // Navigate back to invoices after success or cancel
  const handleSuccess = () => {
    setLocation("/invoices");
  };

  return (
    <div className="h-screen flex flex-col">
      <InvoiceForm onSuccess={handleSuccess} onCancel={() => setLocation("/invoices")} />
    </div>
  );
}