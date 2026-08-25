"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import type { MyReviewResponse } from "@/types/review";

type ReviewContent = Pick<
  MyReviewResponse,
  "reviewId" | "content" | "contentLanguage" | "sourceLanguage" | "originalContent"
>;

export function TranslatedReviewContent({
  review,
  className = "",
}: Readonly<{ review: ReviewContent; className?: string }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Reviews");
  const [showOriginal, setShowOriginal] = useState(false);
  const currentLanguage = getContentLanguage(locale);
  const hasTranslation =
    review.contentLanguage === currentLanguage && review.contentLanguage !== review.sourceLanguage;
  const visibleContent = hasTranslation && showOriginal ? review.originalContent : review.content;

  return (
    <div className={className}>
      <p className="text-sm leading-6 whitespace-pre-line text-ink">{visibleContent}</p>
      {hasTranslation ? (
        <button
          type="button"
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((current) => !current)}
          className="mt-1.5 text-xs font-medium text-muted transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {showOriginal ? t("showTranslation") : t("showOriginal")}
        </button>
      ) : null}
    </div>
  );
}
