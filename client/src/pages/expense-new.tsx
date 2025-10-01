import { useLocation } from "wouter";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ExpenseNew() {
  const [, navigate] = useLocation();

  const handleSuccess = () => {
    navigate("/expenses");
  };

  const handleCancel = () => {
    navigate("/expenses");
  };

  return (
    <div className="py-6">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/expenses")}
            className="mb-4"
            data-testid="button-back-to-expenses"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Expenses
          </Button>
          
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="heading-new-expense">
            New Expense
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Record a new expense transaction
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>
              Enter the details of your expense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
