"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ReviewCard } from "@/components/review/ReviewCard";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { activityReviewsQueryOptions } from "@/lib/query/reviews";

/**
 * 활동 상세의 후기 섹션.
 * 첫 페이지(6건)를 미리보기로 보여주고, 남은 후기는 페이지를 이어 붙여 더 불러온다.
 */
export function ActivityReviewsSection({
  activityId,
  id,
}: Readonly<{ activityId: number | string; id?: string }>) {
  const t = useTranslations("Reviews");
  const reviewsQuery = useInfiniteQuery(activityReviewsQueryOptions(activityId));

  const pages = reviewsQuery.data?.pages ?? [];
  const reviews = pages.flatMap((page) => page.reviews);
  const firstPage = pages[0];
  const totalCount = firstPage?.totalCount ?? 0;

  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-5 border-t border-line-soft pt-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-bold text-ink">{t("sectionTitle")}</h2>
        <RatingSummary rating={firstPage?.averageRating} size="md" />
        <span className="text-sm text-muted">{t("countLabel", { count: totalCount })}</span>
      </div>

      {reviewsQuery.isPending ? <p className="text-sm text-muted">{t("loading")}</p> : null}
      {reviewsQuery.isError ? <p className="text-sm text-primary">{t("loadError")}</p> : null}

      {!reviewsQuery.isPending && !reviewsQuery.isError && reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="font-display text-sm font-bold text-ink">{t("none")}</p>
          <p className="mt-1 text-sm text-muted">{t("noneDescription")}</p>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.reviewId}>
              <ReviewCard review={review} />
            </li>
          ))}
        </ul>
      ) : null}

      {reviewsQuery.hasNextPage ? (
        <button
          type="button"
          onClick={() => void reviewsQuery.fetchNextPage()}
          disabled={reviewsQuery.isFetchingNextPage}
          className="self-start rounded-full border border-primary px-5 py-2.5 font-display text-sm font-bold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
        >
          {reviewsQuery.isFetchingNextPage
            ? t("loading")
            : pages.length === 1
              ? t("showAll", { count: totalCount })
              : t("loadMore")}
        </button>
      ) : null}
    </section>
  );
}
