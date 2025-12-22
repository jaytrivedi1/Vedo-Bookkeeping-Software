import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Plus,
  Pin,
  PinOff,
  Trash2,
  StickyNote,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ContactNote {
  id: number;
  contactId: number;
  content: string;
  isPinned: boolean;
  createdAt: string;
  createdBy: number | null;
}

interface NotesTabProps {
  contactId: number;
  contactType: "customer" | "vendor";
}

export default function NotesTab({ contactId, contactType }: NotesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ContactNote | null>(null);

  // Fetch notes for this contact
  const {
    data: notes = [],
    isLoading,
    error,
  } = useQuery<ContactNote[]>({
    queryKey: [`/api/contacts/${contactId}/notes`],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest(`/api/contacts/${contactId}/notes`, "POST", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${contactId}/notes`],
      });
      setNewNoteContent("");
      setIsAddingNote(false);
      toast({
        title: "Note added",
        description: "Your note has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add note",
        variant: "destructive",
      });
    },
  });

  // Pin note mutation
  const pinNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest(`/api/contact-notes/${noteId}/pin`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${contactId}/notes`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Note pinned",
        description: "This note will now appear as an alert in other tabs.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pin note",
        variant: "destructive",
      });
    },
  });

  // Unpin note mutation
  const unpinNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest(`/api/contact-notes/${noteId}/unpin`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${contactId}/notes`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: "Note unpinned",
        description: "This note is no longer pinned.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unpin note",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return apiRequest(`/api/contact-notes/${noteId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/contacts/${contactId}/notes`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setNoteToDelete(null);
      toast({
        title: "Note deleted",
        description: "The note has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    createNoteMutation.mutate(newNoteContent.trim());
  };

  const handlePinToggle = (note: ContactNote) => {
    if (note.isPinned) {
      unpinNoteMutation.mutate(note.id);
    } else {
      pinNoteMutation.mutate(note.id);
    }
  };

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const regularNotes = notes.filter((n) => !n.isPinned);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>Failed to load notes</p>
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-sm rounded-2xl">
      <CardContent className="px-4 pt-4 pb-6">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-600">
            Private notes · Not visible to {contactType}
          </p>
          {!isAddingNote && (
            <Button
              onClick={() => setIsAddingNote(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 h-8"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Note
            </Button>
          )}
        </div>

        {/* Add Note Form */}
        {isAddingNote && (
          <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Write your note here..."
              className="min-h-[120px] resize-none bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNoteContent("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={
                  !newNoteContent.trim() || createNoteMutation.isPending
                }
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {createNoteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Note"
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Pinned Notes Section */}
        {pinnedNotes.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Pin className="h-3.5 w-3.5" />
              Pinned
            </h4>
            <div className="space-y-3">
              {pinnedNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPinToggle={() => handlePinToggle(note)}
                  onDelete={() => setNoteToDelete(note)}
                  isPinning={
                    pinNoteMutation.isPending || unpinNoteMutation.isPending
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* All Notes Section */}
        {regularNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                All Notes
              </h4>
            )}
            <div className="space-y-3">
              {regularNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onPinToggle={() => handlePinToggle(note)}
                  onDelete={() => setNoteToDelete(note)}
                  isPinning={
                    pinNoteMutation.isPending || unpinNoteMutation.isPending
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {notes.length === 0 && !isAddingNote && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <StickyNote className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              No notes yet
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Add internal notes to keep track of important information about
              this {contactType}.
            </p>
            <Button
              onClick={() => setIsAddingNote(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Note
            </Button>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!noteToDelete}
          onOpenChange={(open) => !open && setNoteToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Note</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this note? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  noteToDelete && deleteNoteMutation.mutate(noteToDelete.id)
                }
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteNoteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// Individual Note Card Component
interface NoteCardProps {
  note: ContactNote;
  onPinToggle: () => void;
  onDelete: () => void;
  isPinning: boolean;
}

function NoteCard({ note, onPinToggle, onDelete, isPinning }: NoteCardProps) {
  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border transition-colors",
        note.isPinned
          ? "bg-amber-50 border-amber-200"
          : "bg-white border-slate-200 hover:border-slate-300"
      )}
    >
      {/* Note Content */}
      <p className="text-sm text-slate-700 whitespace-pre-wrap pr-20">
        {note.content}
      </p>

      {/* Timestamp */}
      <p className="text-xs text-slate-400 mt-2">
        {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
      </p>

      {/* Action Buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onPinToggle}
          disabled={isPinning}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            note.isPinned
              ? "bg-amber-200 text-amber-700 hover:bg-amber-300"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          )}
          title={note.isPinned ? "Unpin note" : "Pin note"}
        >
          {note.isPinned ? (
            <PinOff className="h-4 w-4" />
          ) : (
            <Pin className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
          title="Delete note"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
