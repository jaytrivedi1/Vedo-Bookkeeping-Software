import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ExpenseResponse {
  transaction: any;
  lineItems: any[];
  ledgerEntries: any[];
}

export default function ExpenseEdit() {
  const [, navigate] = useLocation();
  const params = useParams();
  const expenseId = params.id;

  // Fetch expense data
  const { data, isLoading, error } = useQuery<ExpenseResponse>({
    queryKey: ['/api/transactions', expenseId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${expenseId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch expense");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading expense...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive" data-testid="error-state">
        <p className="text-lg">Error loading expense: {String(error)}</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => window.history.back()}
          data-testid="button-go-back"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center" data-testid="not-found-state">
        <p className="text-lg">Expense not found</p>
        <button
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          onClick={() => window.history.back()}
          data-testid="button-go-back"
        >
          Go Back
        </button>
      </div>
    );
  }

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
          
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="heading-edit-expense">
            Edit Expense
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Update the details of this expense
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>
              Modify the details of your expense
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              expense={data.transaction}
              lineItems={data.lineItems}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
