"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Shuffle,
} from "lucide-react";
import type { GrePrompt } from "@/types/review";
import { formatTime } from "./Timer";

type EssayEditorProps = {
  prompt: GrePrompt;
  essay: string;
  wordCount: number;
  paragraphCount: number;
  remainingSeconds: number;
  isTimerRunning: boolean;
  isPromptLoading: boolean;
  onGeneratePrompt: () => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onChange: (value: string) => void;
};

export function EssayEditor({
  prompt,
  essay,
  wordCount,
  paragraphCount,
  remainingSeconds,
  isTimerRunning,
  isPromptLoading,
  onGeneratePrompt,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onChange,
}: EssayEditorProps) {
  const formattedTime = formatTime(remainingSeconds);
  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 120;
  const [isPromptVisible, setIsPromptVisible] = useState(true);

  return (
    <section
      aria-labelledby="essay-editor-title"
      className="flex h-full min-h-0 flex-col bg-white dark:bg-stone-950"
    >
      {isPromptVisible ? (
        <div
          id="essay-prompt-panel"
          className="h-36 shrink-0 overflow-hidden border-b border-stone-200 px-3 py-3 dark:border-stone-800 sm:h-32 sm:px-5 sm:py-2.5 lg:h-auto lg:overflow-visible"
        >
          <div className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:grid-rows-1 sm:items-start lg:h-auto">
            <div className="min-h-0 min-w-0 overflow-y-auto pr-1 lg:overflow-visible">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="essay-editor-title" className="sr-only">
                  Writer
                </h2>
                <span className="rounded-md border border-stone-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-stone-500 dark:border-stone-800 dark:text-stone-400">
                  {prompt.type}
                </span>
                <p className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                  {prompt.title}
                </p>
              </div>
              <p className="font-essay mt-1 break-words text-[0.98rem] leading-6 text-stone-900 dark:text-stone-100">
                {prompt.question}
              </p>
            </div>
            <button
              type="button"
              onClick={onGeneratePrompt}
              disabled={isPromptLoading}
              className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-stone-200 px-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 disabled:cursor-wait disabled:opacity-60 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 sm:h-8 sm:w-auto"
            >
              {isPromptLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Shuffle className="h-4 w-4" aria-hidden="true" />
              )}
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      ) : (
        <h2 id="essay-editor-title" className="sr-only">
          Writer
        </h2>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-stone-200 px-3 py-2 dark:border-stone-800 sm:px-5">
        <button
          type="button"
          onClick={isTimerRunning ? onPauseTimer : onStartTimer}
          aria-label={isTimerRunning ? "Pause timer" : "Start timer"}
          title={isTimerRunning ? "Pause" : "Start"}
          className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-md border border-stone-200 px-0 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 sm:h-9 sm:w-auto sm:px-3"
        >
          {isTimerRunning ? (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {isTimerRunning ? "Stop" : "Start"}
          </span>
        </button>
        <div
          role="timer"
          aria-label={`Time remaining ${formattedTime}`}
          aria-live="polite"
          className={`flex h-10 min-w-[7.5rem] flex-1 items-center justify-center gap-2 rounded-md border px-3 py-1 text-center font-mono text-base font-semibold tabular-nums transition-colors sm:h-9 sm:min-w-[140px] sm:flex-none sm:text-lg ${
            isLowTime
              ? "border-red-300 text-red-700 dark:border-red-900/60 dark:text-red-300"
              : "border-stone-200 text-stone-950 dark:border-stone-800 dark:text-stone-50"
          }`}
        >
          {isTimerRunning ? (
            <span
              aria-hidden="true"
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isLowTime ? "bg-red-500" : "bg-emerald-500"
              } animate-pulse-dot`}
            />
          ) : null}
          <span>{formattedTime}</span>
        </div>
        <div className="hidden flex-1 sm:block" />
        <button
          type="button"
          onClick={() => setIsPromptVisible((value) => !value)}
          aria-label={isPromptVisible ? "Hide prompt" : "Show prompt"}
          aria-expanded={isPromptVisible}
          aria-controls="essay-prompt-panel"
          title={isPromptVisible ? "Hide prompt" : "Show prompt"}
          className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-md border border-stone-200 px-0 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 sm:h-9 sm:w-auto sm:px-3"
        >
          {isPromptVisible ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {isPromptVisible ? "Hide prompt" : "Show prompt"}
          </span>
        </button>
        <button
          type="button"
          onClick={onResetTimer}
          aria-label="Restart timer"
          title="Restart"
          className="inline-flex h-10 w-10 items-center justify-center gap-1.5 rounded-md border border-stone-200 px-0 text-xs font-medium text-stone-700 transition hover:bg-stone-100 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-stone-400 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-900 sm:h-9 sm:w-auto sm:px-3"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Restart</span>
        </button>
      </div>

      <textarea
        value={essay}
        onChange={(event) => onChange(event.target.value)}
        placeholder="write"
        aria-label="GRE essay response editor"
        spellCheck="true"
        className="font-essay min-h-0 flex-1 resize-none overflow-y-auto border-b border-stone-200 bg-transparent px-3 py-5 text-[1.08rem] leading-8 text-stone-900 caret-stone-700 outline-none placeholder:text-stone-400 dark:border-stone-800 dark:text-stone-100 dark:caret-stone-300 sm:px-6 sm:py-6 lg:text-[1.13rem]"
      />

      <footer className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3 text-xs text-stone-500 dark:text-stone-400 sm:px-6">
        <span>
          <span className="font-mono font-semibold tabular-nums text-stone-700 dark:text-stone-200">
            {wordCount}
          </span>{" "}
          Words
        </span>
        <span>
          <span className="font-mono font-semibold tabular-nums text-stone-700 dark:text-stone-200">
            {paragraphCount}
          </span>{" "}
          Paragraphs
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          Saved
        </span>
      </footer>
    </section>
  );
}
