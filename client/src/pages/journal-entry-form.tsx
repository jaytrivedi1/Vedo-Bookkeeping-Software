import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import JournalEntryForm from "@/components/forms/JournalEntryForm";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JournalEntryResponse {
  transaction: any;
  ledgerEntries: any[];
}

export default function JournalEntryFormPage() {
  const [, setLocation] = useLocation();
  const [journalId, setJournalId] = useState<number | null>(null);

  // Extract journal ID from URL
  useEffect(() => {
    const path = window.location.pathname;
    const editMatch = path.match(/\/journals\/(\d+)\/edit/);
    if (editMatch && editMatch[1]) {
      setJournalId(parseInt(editMatch[1]));
    } else {
      setJournalId(null); // New mode
    }
  }, []);

  // Determine if we're in edit mode
  const isEditMode = journalId !== null;

  // Fetch journal entry data when in edit mode
  const { data: transactionData, isLoading: transactionLoading, error: transactionError } = useQuery({
    queryKey: ['/api/transactions', journalId],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${journalId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch journal entry");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  // Fetch ledger entries when in edit mode
  const { data: ledgerEntries, isLoading: ledgerLoading, error: ledgerError } = useQuery({
    queryKey: ['/api/ledger-entries', { transactionId: journalId }],
    queryFn: async () => {
      const params = new URLSearchParams({ transactionId: journalId!.toString() });
      const response = await fetch(`/api/ledger-entries?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ledger entries");
      }
      return response.json();
    },
    enabled: isEditMode,
  });

  // Navigate back to journals list
  const handleSuccess = () => {
    setLocation("/journals");
  };

  const handleCancel = () => {
    setLocation("/journals");
  };

  // Show loading state while fetching journal data in edit mode
  if (isEditMode && (transactionLoading || ledgerLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
            <span className="ml-2">Loading journal entry...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if journal fetch failed
  if (isEditMode && (transactionError || ledgerError)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="h-full flex flex-col items-center justify-center text-destructive">
            <p className="text-lg" data-testid="error-message">
              Error loading journal entry: {String(transactionError || ledgerError)}
            </p>
            <Button
              className="mt-4"
              onClick={() => setLocation("/journals")}
              data-testid="button-back-error"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journal Entries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show not found state if journal doesn't exist
  if (isEditMode && !transactionData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-lg" data-testid="not-found-message">Journal entry not found</p>
            <Button
              className="mt-4"
              onClick={() => setLocation("/journals")}
              data-testid="button-back-not-found"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Journal Entries
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render the journal entry form
  return (
    <div className="min-h-screen bg-background" data-testid={isEditMode ? "edit-journal-page" : "new-journal-page"}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/journals")}
            className="mb-4"
            data-testid="button-back-to-journals"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Journal Entries
          </Button>
          <h1 className="text-3xl font-bold">
            {isEditMode 
              ? `Edit Journal Entry #${transactionData?.transaction?.reference || journalId}` 
              : "New Journal Entry"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isEditMode 
              ? "Update the journal entry with balanced debits and credits"
              : "Create a new journal entry with balanced debits and credits"}
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-6">
          <JournalEntryForm 
            journalEntry={isEditMode ? transactionData?.transaction : undefined}
            ledgerEntries={isEditMode ? ledgerEntries : undefined}
            onSuccess={handleSuccess} 
            onCancel={handleCancel} 
          />
        </div>
      </div>
    </div>
  );
}
