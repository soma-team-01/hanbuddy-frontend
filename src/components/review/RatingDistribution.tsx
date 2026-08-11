"use client";

import { useTranslations } from "next-intl";
import { StarIcon } from "@/components/ui/icons";
import type { ReviewRatingCounts } from "@/types/review";

const RATINGS = [5, 4, 3, 2, 1] as const;

/**
 * 별점 분포 막대. 각 줄을 누르면 그 별점의 후기만 보고, 다시 누르면 전체로 돌아온다.
 * 막대는 필터와 무관하게 항상 전체 기준이라 다른 별점으로 바로 옮겨갈 수 있다.
 */
export function RatingDistribution({
  counts,
  selectedRating,
  onSelectRating,
}: Readonly<{
  counts: ReviewRatingCounts;
  selectedRating: number | null;
  onSelectRating: (rating: number | null) => void;
}>) {
  const t = useTranslations("Reviews");
  const total = RATINGS.reduce((sum, rating) => sum + (counts[String(rating)] ?? 0), 0);

  return (
    <div className="flex flex-col gap-1">
      {RATINGS.map((rating) => {
        const count = counts[String(rating)] ?? 0;
        const percent = total > 0 ? (count / total) * 100 : 0;
        const selected = selectedRating === rating;

        return (
          <button
            key={rating}
            type="button"
            aria-pressed={selected}
            disabled={count === 0}
            onClick={() => onSelectRating(selected ? null : rating)}
            className="group flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors enabled:hover:bg-primary-soft disabled:cursor-default disabled:opacity-45"
          >
            <span
              className={`flex w-11 shrink-0 items-center gap-1 text-xs font-semibold tabular-nums ${
                selected ? "text-primary" : "text-muted"
              }`}
            >
              {rating}
              <StarIcon
                className={`size-3 ${selected ? "text-primary" : "text-line-strong"}`}
                aria-hidden="true"
              />
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel">
              <span
                className={`block h-full rounded-full transition-colors ${
                  selected ? "bg-primary" : "bg-primary/45 group-enabled:group-hover:bg-primary"
                }`}
                style={{ width: `${percent}%` }}
              />
            </span>
            <span
              className={`w-10 shrink-0 text-right text-xs tabular-nums ${
                selected ? "font-semibold text-primary" : "text-muted"
              }`}
            >
              {count}
            </span>
            <span className="sr-only">{t("filterByRating", { rating })}</span>
          </button>
        );
      })}
    </div>
  );
}
