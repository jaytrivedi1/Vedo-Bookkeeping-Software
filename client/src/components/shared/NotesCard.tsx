import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Info, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface NotesCardProps {
  contactId: number;
  initialNotes: string | null;
  contactType: "customer" | "vendor";
}

export default function NotesCard({ contactId, initialNotes, contactType }: NotesCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(initialNotes || "");
  const [lastSavedNotes, setLastSavedNotes] = useState(initialNotes || "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Update local state when initialNotes changes (e.g., switching contacts)
  useEffect(() => {
    setNotes(initialNotes || "");
    setLastSavedNotes(initialNotes || "");
    setSaveStatus("idle");
  }, [contactId, initialNotes]);

  // Mutation to save notes
  const saveNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      return apiRequest(`/api/contacts/${contactId}`, 'PATCH', { notes: newNotes });
    },
    onMutate: () => {
      setSaveStatus("saving");
    },
    onSuccess: () => {
      setLastSavedNotes(notes);
      setSaveStatus("saved");
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    onError: (error: any) => {
      setSaveStatus("idle");
      toast({
        title: "Failed to save notes",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (value: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          if (value !== lastSavedNotes) {
            saveNotesMutation.mutate(value);
          }
        }, 1000);
      };
    })(),
    [lastSavedNotes]
  );

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setNotes(newValue);
    debouncedSave(newValue);
  };

  const placeholder = contactType === "customer"
    ? "Add internal notes about this customer..."
    : "Add internal notes about this vendor...";

  return (
    <Card className="border-0 shadow-sm rounded-2xl h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            Internal Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Save Status Indicator */}
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}

            {/* Privacy Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    These notes are for internal use only and are not visible to the {contactType}.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder={placeholder}
          className="min-h-[120px] resize-none bg-amber-50 border-amber-200 focus:border-amber-300 focus:ring-amber-200 text-sm placeholder:text-amber-400/70"
        />
      </CardContent>
    </Card>
  );
}
