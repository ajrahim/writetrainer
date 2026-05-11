import type { ScoreDimension } from "@/types/review";

type ScoreCardProps = {
  dimension: ScoreDimension;
};

export function ScoreCard({ dimension }: ScoreCardProps) {
  const percentage = Math.round((dimension.score / 6) * 100);

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-950">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
            {dimension.label}
          </h4>
          <p className="mt-1 text-xs leading-5 text-stone-500 dark:text-stone-400">
            {dimension.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 font-mono text-sm font-semibold text-stone-900 dark:bg-stone-900 dark:text-stone-100">
          {dimension.score.toFixed(1)}
        </span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-900"
        aria-label={`${dimension.label} score ${dimension.score} out of 6`}
      >
        <div
          className="h-full rounded-full bg-stone-900 transition-[width] duration-500 ease-out dark:bg-stone-100"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </article>
  );
}
