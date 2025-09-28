import { useLocation } from "wouter";
import PayBillForm from "@/components/forms/PayBillForm";

export default function PayBill() {
  const [, navigate] = useLocation();

  const handleSuccess = () => {
    navigate("/transactions");
  };

  const handleCancel = () => {
    navigate("/transactions");
  };

  return (
    <PayBillForm 
      onSuccess={handleSuccess} 
      onCancel={handleCancel} 
    />
  );
}