"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { RatingDistribution } from "@/components/review/RatingDistribution";
import { ReviewCard } from "@/components/review/ReviewCard";
import { useInfiniteScrollSentinel } from "@/components/ui/use-infinite-scroll-sentinel";
import { XIcon } from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import {
  activityReviewSummaryQueryOptions,
  activityReviewsQueryOptions,
  REVIEW_PAGE_SIZE,
} from "@/lib/query/reviews";
import type { ContentLanguage } from "@/types/content-language";

/**
 * 활동의 전체 후기 목록 다이얼로그.
 * 헤더와 별점 분포는 고정하고 목록만 스크롤하며, 바닥에 닿으면 12건씩 이어 붙인다.
 */
export function ActivityReviewsDialog({
  activityId,
  language,
  onClose,
}: Readonly<{
  activityId: number | string;
  language: ContentLanguage;
  onClose: () => void;
}>) {
  const t = useTranslations("Reviews");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  // 평균 별점과 분포는 전체 기준이라 필터를 타지 않는 요약 캐시에서 읽는다 (상세 섹션과 공유)
  const summaryQuery = useQuery(activityReviewSummaryQueryOptions(activityId, language));
  const reviewsQuery = useInfiniteQuery(
    activityReviewsQueryOptions(activityId, language, REVIEW_PAGE_SIZE, selectedRating),
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const pages = reviewsQuery.data?.pages ?? [];
  const firstPage = pages[0];
  const ratingCounts = summaryQuery.data?.ratingCounts;
  const reviews = pages.flatMap((page) => page.reviews);
  const totalCount = firstPage?.totalCount ?? 0;
  const canLoadMore = reviewsQuery.hasNextPage && !reviewsQuery.isFetchingNextPage;
  const sentinelRef = useInfiniteScrollSentinel(() => {
    void reviewsQuery.fetchNextPage();
  }, canLoadMore);

  function selectRating(rating: number | null) {
    setSelectedRating(rating);
    // 필터를 바꾸면 목록이 통째로 갈리므로 읽던 위치가 아니라 맨 위에서 시작한다
    scrollRef.current?.scrollTo({ top: 0 });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="activity-reviews-title"
      onClose={onClose}
      className="motion-dialog m-0 flex max-h-[88dvh] w-full max-w-none flex-col overflow-hidden rounded-t-3xl border-0 bg-canvas-soft p-0 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:h-[80dvh] md:w-[calc(100%-3rem)] md:max-w-3xl md:rounded-2xl"
    >
      <div className="flex flex-col gap-4 border-b border-line-soft px-6 py-5 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 id="activity-reviews-title" className="font-display text-xl font-bold text-ink">
              {t("sectionTitle")}
            </h2>
            <RatingSummary rating={summaryQuery.data?.averageRating} size="md" />
            <span className="text-sm text-muted">
              {selectedRating === null
                ? t("countLabel", { count: totalCount })
                : t("filteredCount", { count: totalCount })}
            </span>
          </div>
          <button
            type="button"
            aria-label={tAccessibility("closeDialog")}
            onClick={onClose}
            className="-mt-1.5 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:border hover:border-primary hover:text-primary"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {ratingCounts ? (
          <RatingDistribution
            counts={ratingCounts}
            selectedRating={selectedRating}
            onSelectRating={selectRating}
          />
        ) : null}

        {selectedRating !== null ? (
          <button
            type="button"
            onClick={() => selectRating(null)}
            className="self-start rounded-full border border-primary px-4 py-1.5 font-display text-xs font-bold text-primary transition-colors hover:bg-primary-soft"
          >
            {t("clearFilter")}
          </button>
        ) : null}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 md:px-8">
        {reviewsQuery.isPending ? <p className="text-sm text-muted">{t("loading")}</p> : null}
        {reviewsQuery.isError ? <p className="text-sm text-primary">{t("loadError")}</p> : null}
        {!reviewsQuery.isPending && !reviewsQuery.isError && reviews.length === 0 ? (
          <p className="text-sm text-muted">
            {selectedRating === null ? t("none") : t("noneForRating")}
          </p>
        ) : null}

        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.reviewId}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>

        {/* 스크롤이 바닥에 가까워지면 자동으로 다음 12건을 불러온다 */}
        <div ref={sentinelRef} aria-hidden="true" className="h-px" />

        {reviewsQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => void reviewsQuery.fetchNextPage()}
            disabled={reviewsQuery.isFetchingNextPage}
            className="mt-5 w-full rounded-full border border-primary px-5 py-3 font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
          >
            {reviewsQuery.isFetchingNextPage ? t("loading") : t("loadMore")}
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
