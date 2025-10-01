import React from "react";
import InvoiceForm from "@/components/forms/InvoiceForm";
import { useLocation } from "wouter";

export default function NewInvoice() {
  const [, setLocation] = useLocation();

  // Navigate back to previous page after success
  const handleSuccess = () => {
    setLocation("/invoices");
  };

  // Navigate back to previous page on cancel
  const handleCancel = () => {
    window.history.back();
  };

  return (
    <div className="h-screen flex flex-col">
      <InvoiceForm onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}