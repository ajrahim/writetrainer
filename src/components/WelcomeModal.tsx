"use client";

import { useEffect, useRef } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Code2,
  Infinity,
  KeyRound,
  MessageSquareText,
  Save,
  Settings,
  ShieldCheck,
  TimerReset,
  X,
} from "lucide-react";

type WelcomeModalProps = {
  isOpen: boolean;
  onStart: () => void;
};

const features: Array<{
  label: string;
  description: string;
  Icon: typeof TimerReset;
}> = [
  {
    label: "Timed prompts",
    description: "Practice with GRE-style Issue and Argument tasks.",
    Icon: TimerReset,
  },
  {
    label: "Focused drafting",
    description: "Write in a quiet workspace built for timed essays.",
    Icon: BookOpenCheck,
  },
  {
    label: "Review feedback",
    description: "Get scoring guidance and revision notes when ready.",
    Icon: MessageSquareText,
  },
  {
    label: "Stored Locally",
    description: "Drafts, history, and preferences stay in this browser.",
    Icon: Save,
  },
  {
    label: "Multiple Models",
    description: "Review essays with ChatGPT, Claude, Gemini, or fallbacks.",
    Icon: Settings,
  },
  {
    label: "Custom Keys",
    description: "Use your own keys for enhanced model reviews.",
    Icon: KeyRound,
  },
];

const assurances = [
  { label: "No Accounts", Icon: ShieldCheck },
  { label: "Free Forever", Icon: Infinity },
  { label: "Source Code Available", Icon: Code2 },
];

const featureIconStyles = [
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-indigo-100 text-indigo-700",
  "bg-amber-100 text-amber-700",
];

export function WelcomeModal({ isOpen, onStart }: WelcomeModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusTimeoutId = window.setTimeout(
      () => startButtonRef.current?.focus(),
      0,
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onStart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimeoutId);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen, onStart]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Start writing"
        onClick={onStart}
        className="absolute inset-0 bg-stone-950/45 backdrop-blur-[1px]"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-description"
        className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-xl border border-white/80 bg-gradient-to-br from-sky-50 via-rose-50 to-violet-50 p-4 text-slate-900 shadow-2xl shadow-slate-950/12 outline-none [color-scheme:light] sm:p-5"
      >
        <button
          type="button"
          onClick={onStart}
          aria-label="Close welcome modal"
          title="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/75 text-slate-600 transition hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="space-y-4">
          <div className="px-7 pb-2 pt-3 text-center sm:px-8 sm:pb-3 sm:pt-4">
            <h2
              id="welcome-title"
              className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
            >
              👋 Hello!
            </h2>
            <p
              id="welcome-description"
              className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base"
            >
              Write Trainer is an unofficial GRE® writing practice tool that
              helps you feel more prepared for the essay portion of the exam,
              one focused draft at a time.
            </p>
          </div>

          <div
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Features"
          >
            {features.map(({ label, description, Icon }, index) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-lg border border-white/70 bg-white/60 p-3"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${featureIconStyles[index]}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold leading-5 text-slate-950">
                    {label}
                  </h3>
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/75 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
              {assurances.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/75 bg-white/65 px-2.5 py-1"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            <button
              ref={startButtonRef}
              type="button"
              onClick={onStart}
              className="inline-flex h-11 w-full min-w-40 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-sky-600 px-4 text-sm font-semibold text-white shadow-sm shadow-sky-900/15 transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 active:scale-[0.99] sm:w-auto"
            >
              Start Writing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
