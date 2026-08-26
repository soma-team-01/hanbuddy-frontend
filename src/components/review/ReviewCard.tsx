"use client";

import { useLocale, useTranslations } from "next-intl";
import { ReviewStars } from "@/components/review/ReviewStars";
import { TranslatedReviewContent } from "@/components/review/TranslatedReviewContent";
import { Avatar } from "@/components/ui/Avatar";
import { formatSeoulDate } from "@/lib/datetime";
import type { Locale } from "@/i18n/routing";
import type { ReviewResponse } from "@/types/review";

/**
 * 후기 카드 한 장.
 * 버디 프로필처럼 여러 활동의 후기가 섞이는 곳에서는 `showActivityTitle`로 어떤 활동인지 함께 보여준다.
 */
export function ReviewCard({
  review,
  showActivityTitle = false,
}: Readonly<{ review: ReviewResponse; showActivityTitle?: boolean }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Reviews");
  const writtenOn = formatSeoulDate(review.createdAt, locale);

  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line-soft bg-canvas-soft p-5">
      <div className="flex items-center gap-3">
        <Avatar name={review.reviewerName} src={review.reviewerProfileImageUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-ink">{review.reviewerName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <ReviewStars
              rating={review.rating}
              label={t("ratingAria", { rating: review.rating })}
              starClassName="size-3.5"
            />
            {writtenOn ? <span className="text-xs text-muted">{writtenOn}</span> : null}
          </div>
        </div>
      </div>

      {showActivityTitle ? (
        <p className="truncate text-xs font-semibold text-primary">{review.activityTitle}</p>
      ) : null}

      <TranslatedReviewContent review={review} />
    </article>
  );
}
