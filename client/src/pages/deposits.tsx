import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import DepositForm from "@/components/forms/DepositForm";

export default function DepositsPage() {
  const [_, setLocation] = useLocation();

  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation("/dashboard")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">Create Deposit</h1>
          </div>
        </div>
        
        <DepositForm />
      </div>
    </div>
  );
}