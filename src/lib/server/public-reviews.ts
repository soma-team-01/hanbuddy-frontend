import "server-only";
import { cache } from "react";
import type { Locale } from "@/i18n/routing";
import { getBackend } from "@/lib/auth/backend";
import { getContentLanguage, withContentLanguage } from "@/lib/content-language";
import { REVIEW_PREVIEW_SIZE } from "@/lib/query/reviews";
import type { ReviewPageResponse, ReviewResponse } from "@/types/review";

const nullableString = (value: unknown) => value == null || typeof value === "string";

/** 화면이 바로 읽는 필드만 확인한다. 하나라도 어긋나면 첫 HTML에 넣지 않고 브라우저 재조회에 맡긴다. */
function isReview(value: unknown): value is ReviewResponse {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<Record<keyof ReviewResponse, unknown>>;
  return (
    Number.isSafeInteger(review.reviewId) &&
    typeof review.rating === "number" &&
    Number.isFinite(review.rating) &&
    ["content", "originalContent", "contentLanguage", "sourceLanguage", "createdAt"].every(
      (key) => typeof review[key as keyof ReviewResponse] === "string",
    ) &&
    nullableString(review.reviewerName) &&
    nullableString(review.reviewerProfileImageUrl) &&
    nullableString(review.originalReviewedAt)
  );
}

function isReviewPage(value: unknown): value is ReviewPageResponse {
  if (!value || typeof value !== "object") return false;
  const page = value as Partial<ReviewPageResponse>;
  return (
    Array.isArray(page.reviews) &&
    page.reviews.every(isReview) &&
    typeof page.totalCount === "number" &&
    (page.averageRating === null || typeof page.averageRating === "number")
  );
}

/**
 * 활동 상세 첫 HTML에 넣을 후기 미리보기(최신 3건). 브라우저가 BFF로 받는 것과 같은 백엔드 경로·언어를 쓴다.
 * 첫 화면을 막지 않도록 실패하면 undefined를 돌려주고, 그때는 브라우저가 지금처럼 다시 불러온다.
 */
export const getPublicActivityReviewSummary = cache(
  async (activityId: string, locale: Locale): Promise<ReviewPageResponse | undefined> => {
    try {
      const backend = await getBackend<ReviewPageResponse>(
        withContentLanguage(
          `/activities/${activityId}/reviews?page=0&size=${REVIEW_PREVIEW_SIZE}`,
          getContentLanguage(locale),
        ),
        { redirect: "error" },
      );
      const payload = backend.payload as { isSuccess?: boolean; result?: unknown } | null;
      if (backend.status !== 200 || payload?.isSuccess !== true) return undefined;
      return isReviewPage(payload.result) ? payload.result : undefined;
    } catch {
      return undefined;
    }
  },
);
