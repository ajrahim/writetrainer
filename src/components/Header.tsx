"use client";

import {
  MessageSquareText,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  Sun,
} from "lucide-react";
import { ReviewButton } from "./ReviewButton";

type HeaderProps = {
  isReviewing: boolean;
  isHistoryOpen: boolean;
  isReviewPanelOpen: boolean;
  theme: "light" | "dark";
  onReview: () => void;
  onToggleHistory: () => void;
  onOpenSettings: () => void;
  onToggleReviewPanel: () => void;
  onThemeChange: (theme: "light" | "dark") => void;
};

export function Header({
  isReviewing,
  isHistoryOpen,
  isReviewPanelOpen,
  theme,
  onReview,
  onToggleHistory,
  onOpenSettings,
  onToggleReviewPanel,
  onThemeChange,
}: HeaderProps) {
  return (
    <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:flex-nowrap sm:gap-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <h1 className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50 sm:text-base">
            Write Trainer
          </h1>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            An unofficial GRE® writing preparation tool.
          </p>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleHistory}
            aria-label={
              isHistoryOpen ? "Close writing history" : "Open writing history"
            }
            aria-controls="writing-history-panel"
            aria-expanded={isHistoryOpen}
            title="Writing history"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 sm:hidden"
          >
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
          </button>
          <div
            className="grid shrink-0 grid-cols-2 rounded-lg border border-stone-200 p-1 text-xs font-medium dark:border-stone-800"
            aria-label="Theme"
          >
            <button
              type="button"
              onClick={() => onThemeChange("light")}
              aria-pressed={theme === "light"}
              aria-label="Light theme"
              title="Light"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md px-0 transition focus:outline-none focus:ring-2 focus:ring-stone-400 sm:h-8 sm:w-8 ${
                theme === "light"
                  ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onThemeChange("dark")}
              aria-pressed={theme === "dark"}
              aria-label="Dark theme"
              title="Dark"
              className={`inline-flex h-10 w-10 items-center justify-center rounded-md px-0 transition focus:outline-none focus:ring-2 focus:ring-stone-400 sm:h-8 sm:w-8 ${
                theme === "dark"
                  ? "bg-stone-950 text-white dark:bg-stone-100 dark:text-stone-950"
                  : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <ReviewButton onClick={onReview} isLoading={isReviewing} />
          <button
            type="button"
            onClick={onToggleReviewPanel}
            aria-label={
              isReviewPanelOpen
                ? "Close AI review panel"
                : "Open AI review panel"
            }
            aria-controls="ai-review-panel"
            aria-expanded={isReviewPanelOpen}
            title={isReviewPanelOpen ? "Close review" : "Open review"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 lg:hidden"
          >
            {isReviewPanelOpen ? (
              <PanelRightClose className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelRightOpen className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            aria-haspopup="dialog"
            title="Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
