import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ExpenseForm from "@/components/forms/ExpenseForm";
import { Loader2 } from "lucide-react";

interface ExpenseResponse {
  transaction: any;
  lineItems: any[];
  ledgerEntries: any[];
}

export default function ExpenseEdit() {
  const [, setLocation] = useLocation();
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

  return (
    <div className="h-screen flex flex-col">
      <ExpenseForm
        expense={data.transaction}
        lineItems={data.lineItems}
        onSuccess={() => setLocation("/expenses")}
        onCancel={() => window.history.back()}
      />
    </div>
  );
}
