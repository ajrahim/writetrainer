"use client";

import {
  ChevronLeft,
  FileText,
  MessageSquareText,
  PanelLeftOpen,
} from "lucide-react";
import type {
  AiReviewProvider,
  ReviewResult,
  WritingHistoryEntry,
} from "@/types/review";

type HistorySidebarProps = {
  entries: WritingHistoryEntry[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectEntry: (entry: WritingHistoryEntry) => void;
};

const providerNames: Record<AiReviewProvider, string> = {
  openai: "GPT",
  anthropic: "Claude",
  gemini: "Gemini",
};

function getDisplayScore(review: ReviewResult | null) {
  if (!review) {
    return "--";
  }

  const score = Number.isFinite(review.scoreOutOfTen)
    ? review.scoreOutOfTen
    : Math.round((review.overallScore / 6) * 100) / 10;
  const rounded = Math.round(score);

  return Number.isFinite(rounded) ? String(rounded) : "--";
}

function getProviderScoreLine(entry: WritingHistoryEntry) {
  return entry.reviewBundle.reviews
    .map(
      (providerReview) =>
        `${providerNames[providerReview.provider]} ${getDisplayScore(
          providerReview.review,
        )}/10`,
    )
    .join(" | ");
}

export function HistorySidebar({
  entries,
  isOpen,
  onToggle,
  onSelectEntry,
}: HistorySidebarProps) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close writing history"
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-stone-950/30 backdrop-blur-[1px] sm:hidden"
        />
      ) : null}

      <aside
        id="writing-history-panel"
        tabIndex={-1}
        aria-label="Writing history"
        className={`fixed inset-y-0 left-0 z-50 border-r border-stone-200 bg-white outline-none transition-[width] duration-200 dark:border-stone-800 dark:bg-stone-950 ${
          isOpen
            ? "w-[min(22rem,100vw)] shadow-xl sm:shadow-none"
            : "pointer-events-none w-0 border-r-0 sm:pointer-events-auto sm:w-14 sm:border-r"
        }`}
      >
        <div
          className={`flex h-full min-w-0 flex-col overflow-hidden ${
            isOpen ? "" : "hidden sm:flex"
          }`}
        >
          <div className="flex h-16 items-center justify-center border-b border-stone-200 px-2 dark:border-stone-800">
            <button
              type="button"
              onClick={onToggle}
              aria-label={
                isOpen ? "Collapse writing history" : "Open writing history"
              }
              aria-expanded={isOpen}
              title="Writing history"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:text-stone-200 dark:hover:bg-stone-900"
            >
              {isOpen ? (
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              ) : (
                <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {isOpen ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <PanelLeftOpen
                  className="h-4 w-4 text-stone-500 dark:text-stone-400"
                  aria-hidden="true"
                />
                <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
                  Writing History
                </h2>
              </div>

              {entries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 p-4 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
                  No saved reviews yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onSelectEntry(entry)}
                      className="w-full rounded-lg border border-stone-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-stone-700 dark:hover:bg-stone-900"
                    >
                      <div className="flex items-start gap-2">
                        <FileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400"
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
                            {entry.essayName}
                          </h3>
                          <p className="mt-1 text-xs font-medium leading-5 text-stone-600 dark:text-stone-300">
                            {getProviderScoreLine(entry)}
                          </p>
                          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
