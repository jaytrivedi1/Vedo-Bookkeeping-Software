import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function ExpenseFormPage() {
  const [, setLocation] = useLocation();
  const [expenseId, setExpenseId] = useState<number | null>(null);

  // Extract expense ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/expenses\/(\d+)\/edit/);
    if (editMatch && editMatch[1]) {
      setExpenseId(parseInt(editMatch[1]));
    } else {
      setExpenseId(null); // New mode
    }
  }, []);

  // Determine if we're in edit mode
  const isEditMode = expenseId !== null;

  // Fetch expense data when in edit mode
  const { data, isLoading, error } = useQuery<ExpenseResponse>({
    queryKey: ['/api/transactions', expenseId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${expenseId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch expense");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  // Navigate back to expenses list
  const handleSuccess = () => {
    setLocation("/expenses");
  };

  const handleCancel = () => {
    setLocation("/expenses");
  };

  // Show loading state while fetching expense data in edit mode
  if (isEditMode && isLoading) {
    return (
      <div className="h-full flex items-center justify-center" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading expense...</span>
      </div>
    );
  }

  // Show error state if expense fetch failed
  if (isEditMode && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-destructive" data-testid="error-state">
        <p className="text-lg">Error loading expense: {String(error)}</p>
        <Button
          className="mt-4"
          onClick={() => setLocation("/expenses")}
          data-testid="button-back-error"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
      </div>
    );
  }

  // Show not found state if expense doesn't exist
  if (isEditMode && !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center" data-testid="not-found-state">
        <p className="text-lg">Expense not found</p>
        <Button
          className="mt-4"
          onClick={() => setLocation("/expenses")}
          data-testid="button-back-not-found"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Expenses
        </Button>
      </div>
    );
  }

  // Render the expense form
  return (
    <div className="py-6" data-testid={isEditMode ? "edit-expense-page" : "new-expense-page"}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/expenses")}
            className="mb-4"
            data-testid="button-back-to-expenses"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Expenses
          </Button>
          
          <h1 className="text-2xl font-semibold text-gray-900" data-testid={isEditMode ? "heading-edit-expense" : "heading-new-expense"}>
            {isEditMode ? `Edit Expense ${data?.transaction?.reference ? `#${data.transaction.reference}` : ''}` : 'New Expense'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode ? 'Update the details of this expense' : 'Record a new expense transaction'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>
              {isEditMode ? 'Modify the details of your expense' : 'Enter the details of your expense'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              expense={isEditMode ? data?.transaction : undefined}
              lineItems={isEditMode ? data?.lineItems : undefined}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
