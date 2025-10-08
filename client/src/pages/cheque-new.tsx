import { useLocation } from "wouter";
import ChequeForm from "@/components/forms/ChequeForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ChequeNew() {
  const [, navigate] = useLocation();

  const handleSuccess = () => {
    navigate("/transactions");
  };

  const handleCancel = () => {
    navigate("/transactions");
  };

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
          
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="heading-new-cheque">
            New Cheque
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create a new cheque payment
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cheque Details</CardTitle>
            <CardDescription>
              Enter the details of your cheque payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChequeForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
