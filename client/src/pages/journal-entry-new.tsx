import { useLocation } from "wouter";
import JournalEntryForm from "@/components/forms/JournalEntryForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function JournalEntryNew() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/journals");
  };

  const handleCancel = () => {
    setLocation("/journals");
  };

  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="text-3xl font-bold">New Journal Entry</h1>
          <p className="text-muted-foreground mt-2">
            Create a new journal entry with balanced debits and credits
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-6">
          <JournalEntryForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </div>
      </div>
    </div>
  );
}
