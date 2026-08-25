"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getContentLanguage, getContentLanguageTag } from "@/lib/content-language";
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
  const visibleLanguage =
    hasTranslation && showOriginal ? review.sourceLanguage : review.contentLanguage;

  return (
    <div className={className}>
      <p
        lang={getContentLanguageTag(visibleLanguage)}
        className="text-sm leading-6 [overflow-wrap:anywhere] break-words whitespace-pre-line text-ink"
      >
        {visibleContent}
      </p>
      {hasTranslation ? (
        <button
          type="button"
          aria-pressed={showOriginal}
          onClick={() => setShowOriginal((current) => !current)}
          className="mt-1 px-1 text-[11px] font-medium text-muted/55 underline-offset-2 transition-colors hover:text-muted hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {showOriginal ? t("showTranslation") : t("showOriginal")}
        </button>
      ) : null}
    </div>
  );
}
