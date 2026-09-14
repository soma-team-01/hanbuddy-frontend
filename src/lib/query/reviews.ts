import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getActivityReviews, getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import type { ContentLanguage } from "@/types/content-language";
import { unwrapApiResult } from "./result";

/** 활동 상세 본문의 미리보기는 한 열에 최신 3건만 보여준다 */
export const REVIEW_PREVIEW_SIZE = 3;
/** 전체 후기 목록(다이얼로그·호스트 프로필)은 12건씩 이어 붙인다 */
export const REVIEW_PAGE_SIZE = 12;

export const reviewKeys = {
  all: () => ["reviews"] as const,
  activity: (activityId: number | string, language?: ContentLanguage) =>
    language
      ? ([...reviewKeys.all(), "activity", String(activityId), language] as const)
      : ([...reviewKeys.all(), "activity", String(activityId)] as const),
  buddy: (buddyId: number | string, language?: ContentLanguage) =>
    language
      ? ([...reviewKeys.all(), "buddy", String(buddyId), language] as const)
      : ([...reviewKeys.all(), "buddy", String(buddyId)] as const),
};

export const buddyProfileKeys = {
  all: () => ["buddies"] as const,
  profile: (buddyId: number | string) => [...buddyProfileKeys.all(), String(buddyId)] as const,
};

/**
 * 활동 상세 미리보기 겸 후기 요약 조회.
 * 평균 별점과 별점 분포는 필터와 무관하게 전체 기준이라, 다이얼로그도 같은 캐시를 읽는다.
 */
export function activityReviewSummaryQueryOptions(
  activityId: number | string,
  language: ContentLanguage,
  size: number = REVIEW_PREVIEW_SIZE,
) {
  return queryOptions({
    queryKey: [...reviewKeys.activity(activityId, language), "summary", size],
    queryFn: async () =>
      unwrapApiResult(await getActivityReviews(activityId, 0, size, language), "reviews"),
    staleTime: 60_000,
  });
}

export function activityReviewsQueryOptions(
  activityId: number | string,
  language: ContentLanguage,
  size: number = REVIEW_PAGE_SIZE,
  /** 1~5. 지정하면 그 별점의 후기만 이어 붙인다 */
  rating: number | null = null,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.activity(activityId, language), size, rating],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(
        await getActivityReviews(activityId, pageParam, size, language, rating),
        "reviews",
      ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 60_000,
  });
}

export function buddyReviewsQueryOptions(
  buddyId: number | string,
  language: ContentLanguage,
  size: number = REVIEW_PAGE_SIZE,
  rating: number | null = null,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.buddy(buddyId, language), size, rating],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(await getBuddyReviews(buddyId, pageParam, size, language, rating), "reviews"),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 60_000,
  });
}

export function buddyProfileQueryOptions(buddyId: number | string) {
  return queryOptions({
    queryKey: buddyProfileKeys.profile(buddyId),
    queryFn: async () => unwrapApiResult(await getBuddyProfile(buddyId), "buddy"),
    staleTime: 60_000,
  });
}
