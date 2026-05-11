"use client";

import { ClipboardCheck, Loader2 } from "lucide-react";

type ReviewButtonProps = {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
};

export function ReviewButton({
  onClick,
  isLoading = false,
  className = "",
}: ReviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-label="Review essay"
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-900 bg-stone-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:border-stone-700 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white dark:focus:ring-offset-stone-950 sm:px-4 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">Review Essay</span>
    </button>
  );
}
