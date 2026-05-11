"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

type TimerProps = {
  remainingSeconds: number;
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
};

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function Timer({
  remainingSeconds,
  isRunning,
  onStart,
  onPause,
  onReset,
}: TimerProps) {
  const formattedTime = formatTime(remainingSeconds);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-1.5 dark:border-stone-800 dark:bg-stone-950">
      <div
        role="timer"
        aria-label={`Time remaining ${formattedTime}`}
        aria-live="polite"
        className="min-w-[86px] rounded-lg bg-stone-100 px-3 py-2 text-center font-mono text-lg font-semibold tabular-nums text-stone-950 dark:bg-stone-900 dark:text-stone-50"
      >
        {formattedTime}
      </div>
      <div className="flex items-center gap-1" aria-label="Timer controls">
        <button
          type="button"
          onClick={isRunning ? onPause : onStart}
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          title={isRunning ? "Pause" : "Start"}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          {isRunning ? (
            <Pause className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset timer to 30 minutes"
          title="Reset"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 transition hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
