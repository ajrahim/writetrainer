"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MessageSquareText,
  PanelRightOpen,
  Sparkles,
  X,
} from "lucide-react";
import type {
  MultiReviewResult,
  ProviderReview,
  ReviewResult,
} from "@/types/review";
import { ScoreCard } from "./ScoreCard";

type ReviewSidebarProps = {
  reviewBundle: MultiReviewResult | null;
  isReviewing: boolean;
  isOpen: boolean;
  reviewProviderSummary: string;
  onClose: () => void;
};

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center dark:border-stone-700 dark:bg-stone-900 sm:min-h-[360px]">
      <MessageSquareText
        className="h-8 w-8 text-stone-400 dark:text-stone-500"
        aria-hidden="true"
      />
      <p className="mt-3 text-sm font-medium text-stone-700 dark:text-stone-300">
        Your GRE review will appear here
      </p>
      <p className="mt-2 text-xs leading-5 text-stone-500 dark:text-stone-400">
        Use the review button or press Ctrl/Cmd + Enter when you are ready.
      </p>
    </div>
  );
}

function LoadingState({
  reviewProviderSummary,
}: {
  reviewProviderSummary: string;
}) {
  return (
    <div
      className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-stone-200 bg-stone-50 p-5 text-center dark:border-stone-800 dark:bg-stone-900 sm:min-h-[360px]"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm dark:bg-stone-950">
        <Sparkles
          className="absolute h-6 w-6 text-stone-500 dark:text-stone-400"
          aria-hidden="true"
        />
        <Loader2
          className="h-12 w-12 animate-spin text-stone-200 dark:text-stone-700"
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
        Reviewing your essay
      </p>
      <p className="mt-2 text-xs leading-5 text-stone-600 dark:text-stone-400">
        Using {reviewProviderSummary}.
      </p>
    </div>
  );
}

function ProviderTabs({
  reviewBundle,
  selectedProvider,
  onSelect,
}: {
  reviewBundle: MultiReviewResult | null;
  selectedProvider: ProviderReview["provider"];
  onSelect: (provider: ProviderReview["provider"]) => void;
}) {
  if (!reviewBundle?.reviews.length) {
    return null;
  }

  return (
    <div
      role="tablist"
      aria-label="Choose AI review provider"
      className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-stone-200 bg-stone-100 p-1 dark:border-stone-800 dark:bg-stone-900"
    >
      {reviewBundle.reviews.map((providerReview) => {
        const isSelected = providerReview.provider === selectedProvider;

        return (
          <button
            key={providerReview.provider}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(providerReview.provider)}
            className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-stone-400 ${
              isSelected
                ? "bg-white text-stone-950 shadow-sm dark:bg-stone-950 dark:text-stone-50"
                : "text-stone-600 hover:bg-white/60 dark:text-stone-300 dark:hover:bg-stone-800"
            }`}
          >
            {providerReview.label}
          </button>
        );
      })}
    </div>
  );
}

function ReviewSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
      <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
        {title}
      </h3>
      <ul className="mt-2 space-y-2 text-xs leading-5 text-stone-600 dark:text-stone-300">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-lg bg-stone-50 px-3 py-2 dark:bg-stone-900/80"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function getScoreImprovementItems(review: ReviewResult) {
  return Array.from(
    new Set([...review.suggestions, ...review.weaknesses]),
  ).slice(0, 6);
}

function ReviewContent({
  providerReview,
  isReviewing,
  reviewProviderSummary,
}: {
  providerReview: ProviderReview | null;
  isReviewing: boolean;
  reviewProviderSummary: string;
}) {
  if (isReviewing) {
    return <LoadingState reviewProviderSummary={reviewProviderSummary} />;
  }

  if (!providerReview?.review) {
    return <EmptyState />;
  }

  const review = providerReview.review;

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
              {providerReview.label}
            </h3>
            <p className="mt-1 break-words text-xs text-stone-500 dark:text-stone-400">
              {providerReview.model}
            </p>
          </div>
          <span className="rounded-full border border-stone-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 dark:border-stone-700 dark:text-stone-400">
            {providerReview.source === "ai" ? "AI" : "Local"}
          </span>
        </div>
        {providerReview.error ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
            {providerReview.error}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-4 text-stone-950 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-50">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
          Overall GRE Score
        </p>
        <div className="mt-3 flex items-end gap-2">
          <span className="font-mono text-5xl font-bold leading-none">
            {review.overallScore.toFixed(1)}
          </span>
          <span className="pb-1 text-sm text-stone-500 dark:text-stone-400">
            / 6
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          {review.bandDescription}
        </p>
      </section>

      <section className="space-y-2" aria-label="Score breakdown">
        {review.dimensions.map((dimension) => (
          <ScoreCard key={dimension.label} dimension={dimension} />
        ))}
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
        <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
          Feedback
        </h3>
        <p className="mt-2 text-xs leading-5 text-stone-600 dark:text-stone-300">
          {review.feedback}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-stone-50 p-2 dark:bg-stone-900/80">
            <dt className="text-stone-500 dark:text-stone-400">Words</dt>
            <dd className="mt-1 font-mono font-semibold text-stone-900 dark:text-stone-100">
              {review.metrics.wordCount}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 p-2 dark:bg-stone-900/80">
            <dt className="text-stone-500 dark:text-stone-400">Transitions</dt>
            <dd className="mt-1 font-mono font-semibold text-stone-900 dark:text-stone-100">
              {review.metrics.transitionCount}
            </dd>
          </div>
        </dl>
      </section>

      <ReviewSection
        title="Improve for a Higher Score"
        items={getScoreImprovementItems(review)}
      />
      <ReviewSection title="Things You Did Well" items={review.strengths} />
    </div>
  );
}

export function ReviewSidebar({
  reviewBundle,
  isReviewing,
  isOpen,
  reviewProviderSummary,
  onClose,
}: ReviewSidebarProps) {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderReview["provider"]>("openai");
  const activeReview = useMemo(
    () =>
      reviewBundle?.reviews.find(
        (providerReview) => providerReview.provider === selectedProvider,
      ) ??
      reviewBundle?.reviews[0] ??
      null,
    [reviewBundle, selectedProvider],
  );

  useEffect(() => {
    if (!reviewBundle?.reviews.length) {
      return;
    }

    if (
      !reviewBundle.reviews.some(
        (providerReview) => providerReview.provider === selectedProvider,
      )
    ) {
      setSelectedProvider(reviewBundle.reviews[0].provider);
    }
  }, [reviewBundle, selectedProvider]);

  return (
    <aside
      id="ai-review-panel"
      tabIndex={-1}
      className={`fixed inset-y-0 right-0 z-50 w-[min(22rem,100vw)] shrink-0 flex-col border-l border-stone-200 bg-white shadow-xl outline-none dark:border-stone-800 dark:bg-stone-950 lg:static lg:z-auto lg:flex lg:h-full lg:w-[320px] lg:shadow-none ${
        isOpen ? "flex" : "hidden"
      }`}
      aria-label="AI review panel"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
              AI Review
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {reviewBundle?.reviews.length
                ? reviewBundle.reviews
                    .map((providerReview) => providerReview.label)
                    .join(", ")
                : reviewProviderSummary}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PanelRightOpen
              className="hidden h-4 w-4 text-stone-400 lg:block"
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI review panel"
              title="Close review"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ProviderTabs
          reviewBundle={reviewBundle}
          selectedProvider={selectedProvider}
          onSelect={setSelectedProvider}
        />
        <ReviewContent
          providerReview={activeReview}
          isReviewing={isReviewing}
          reviewProviderSummary={reviewProviderSummary}
        />
      </div>
    </aside>
  );
}
