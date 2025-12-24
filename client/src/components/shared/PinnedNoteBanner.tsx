import { Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PinnedNoteBannerProps {
  note: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Alert banner to display pinned important notes
 * Shows at the top of workspace tabs (except Notes tab)
 */
export default function PinnedNoteBanner({
  note,
  onDismiss,
  className,
}: PinnedNoteBannerProps) {
  if (!note) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-lg",
        "bg-amber-50 border border-amber-200",
        className
      )}
    >
      <Pin className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-amber-800 font-medium leading-relaxed">
        {note}
      </p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 -m-1 rounded hover:bg-amber-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-amber-600" />
        </button>
      )}
    </div>
  );
}
