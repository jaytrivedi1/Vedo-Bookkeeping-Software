import { useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ContactNote } from "@shared/schema";
import { Pin, StickyNote, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface PinnedNotesCardProps {
  contactId: number;
  onNavigateToNotes: () => void;
}

export default function PinnedNotesCard({
  contactId,
  onNavigateToNotes,
}: PinnedNotesCardProps) {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Fetch contact notes
  const { data: notes } = useQuery<ContactNote[]>({
    queryKey: [`/api/contacts/${contactId}/notes`],
  });

  // Find the pinned note (should only be one due to unpin-others logic)
  const pinnedNote = notes?.find((note) => note.isPinned);

  // Check if content is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (contentRef.current) {
        setIsTruncated(
          contentRef.current.scrollHeight > contentRef.current.clientHeight
        );
      }
    };

    checkTruncation();
    // Re-check on window resize
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [pinnedNote?.content]);

  return (
    <Card className="border-0 shadow-sm rounded-2xl h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center justify-between">
          <span>Pinned Note</span>
          {pinnedNote && (
            <Pin className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[calc(100%-3.5rem)]">
        {pinnedNote ? (
          // Active State - Has pinned note
          <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0 border-l-4 border-indigo-500 bg-amber-50/50 rounded-r-lg pl-3 pr-2 py-2">
              <p
                ref={contentRef}
                className="text-sm text-slate-700 line-clamp-3 leading-relaxed"
              >
                {pinnedNote.content}
              </p>
              {isTruncated && (
                <button
                  onClick={onNavigateToNotes}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-1 inline-flex items-center gap-1"
                >
                  Read more
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Pinned {format(new Date(pinnedNote.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        ) : (
          // Empty State - Onboarding
          <div className="h-full flex flex-col items-center justify-center text-center px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <StickyNote className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">
              No pinned notes yet
            </p>
            <p className="text-xs text-slate-400 mb-3 max-w-[180px]">
              Keep important client details handy. Pin a note from the Notes tab.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateToNotes}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 text-xs h-8"
            >
              Go to Notes
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
