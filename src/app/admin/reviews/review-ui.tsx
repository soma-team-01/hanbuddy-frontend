"use client";

import Link from "next/link";
import { adminReviewError, REVIEW_SOURCES, REVIEW_VISIBILITIES } from "@/lib/admin/reviews";
import { isUnauthenticatedError } from "@/lib/api/errors";
import type { AdminReview } from "@/types/admin-review";

export const reviewButton =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-line-strong px-3 py-2 text-xs font-bold transition-colors hover:border-primary hover:text-primary disabled:opacity-40";
export const reviewPrimaryButton = `${reviewButton} border-primary bg-primary text-white hover:bg-primary-hover hover:text-white`;
export const reviewInput =
  "mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-normal text-ink outline-none focus:border-primary";
export const reviewPanel = "rounded-xl border border-line-soft bg-white p-4 md:p-5";
export const reviewMain = "mx-auto w-full max-w-[1200px] px-4 py-5 md:px-5 md:py-6 xl:px-6";

export function ReviewBadges({ review }: { review: Pick<AdminReview, "source" | "visibility"> }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5 text-[11px] font-semibold">
      <span className="rounded-full border border-line-soft px-2 py-0.5 text-muted">
        {REVIEW_SOURCES.find(([value]) => value === review.source)?.[1]}
      </span>
      <span
        className={`rounded-full border px-2 py-0.5 ${review.visibility === "HIDDEN" ? "border-line-strong bg-panel text-muted" : "border-primary/25 text-primary"}`}
      >
        {REVIEW_VISIBILITIES.find(([value]) => value === review.visibility)?.[1]}
      </span>
    </span>
  );
}
export function ReviewError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="my-3 text-sm text-danger">
      <p>{adminReviewError(error)}</p>
      {isUnauthenticatedError(error) ? (
        <Link href="/admin/login" className="mt-2 inline-block underline">
          다시 로그인
        </Link>
      ) : null}
    </div>
  );
}
