"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ActivityReviewsDialog } from "@/components/review/ActivityReviewsDialog";
import { ReviewCard } from "@/components/review/ReviewCard";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { activityReviewSummaryQueryOptions } from "@/lib/query/reviews";
import { getContentLanguage } from "@/lib/content-language";

/**
 * 활동 상세의 후기 섹션.
 * 본문에는 최신 3건만 한 열로 두고, 전체 목록은 다이얼로그에서 12건씩 이어 붙인다.
 */
export function ActivityReviewsSection({
  activityId,
  id,
}: Readonly<{ activityId: number | string; id?: string }>) {
  const t = useTranslations("Reviews");
  const language = getContentLanguage(useLocale());
  const [dialogOpen, setDialogOpen] = useState(false);
  const previewQuery = useQuery(activityReviewSummaryQueryOptions(activityId, language));

  const preview = previewQuery.data;
  const reviews = preview?.reviews ?? [];
  const totalCount = preview?.totalCount ?? 0;

  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-5 border-t border-line-soft pt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-bold text-ink">{t("sectionTitle")}</h2>
        <RatingSummary rating={preview?.averageRating} size="md" />
        {/* 후기가 없을 때는 별점 영역을 통째로 감춘다 — 아래 빈 상태 안내로 충분하다 */}
        {totalCount > 0 ? (
          <span className="text-sm text-muted">{t("countLabel", { count: totalCount })}</span>
        ) : null}
      </div>

      {previewQuery.isPending ? <p className="text-sm text-muted">{t("loading")}</p> : null}
      {previewQuery.isError ? <p className="text-sm text-primary">{t("loadError")}</p> : null}

      {!previewQuery.isPending && !previewQuery.isError && reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="font-display text-sm font-bold text-ink">{t("none")}</p>
          <p className="mt-1 text-sm text-muted">{t("noneDescription")}</p>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.reviewId} className="min-w-0">
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      ) : null}

      {totalCount > reviews.length ? (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="self-start rounded-full border border-primary px-5 py-2.5 font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft"
        >
          {t("showAll", { count: totalCount })}
        </button>
      ) : null}

      {dialogOpen ? (
        <ActivityReviewsDialog
          activityId={activityId}
          language={language}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </section>
  );
}
