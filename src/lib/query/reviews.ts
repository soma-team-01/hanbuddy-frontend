import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getActivityReviews, getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { unwrapApiResult } from "./result";

/** 활동 상세 본문의 미리보기는 6건만 보여준다 */
export const REVIEW_PREVIEW_SIZE = 6;
/** 전체 후기 목록(다이얼로그·호스트 프로필)은 12건씩 이어 붙인다 */
export const REVIEW_PAGE_SIZE = 12;

export const reviewKeys = {
  all: () => ["reviews"] as const,
  activity: (activityId: number | string) =>
    [...reviewKeys.all(), "activity", String(activityId)] as const,
  buddy: (buddyId: number | string) => [...reviewKeys.all(), "buddy", String(buddyId)] as const,
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
  size: number = REVIEW_PREVIEW_SIZE,
) {
  return queryOptions({
    queryKey: [...reviewKeys.activity(activityId), "summary", size],
    queryFn: async () => unwrapApiResult(await getActivityReviews(activityId, 0, size), "reviews"),
    staleTime: 60_000,
  });
}

export function activityReviewsQueryOptions(
  activityId: number | string,
  size: number = REVIEW_PAGE_SIZE,
  /** 1~5. 지정하면 그 별점의 후기만 이어 붙인다 */
  rating: number | null = null,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.activity(activityId), size, rating],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(await getActivityReviews(activityId, pageParam, size, rating), "reviews"),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 60_000,
  });
}

export function buddyReviewsQueryOptions(
  buddyId: number | string,
  size: number = REVIEW_PAGE_SIZE,
  rating: number | null = null,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.buddy(buddyId), size, rating],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(await getBuddyReviews(buddyId, pageParam, size, rating), "reviews"),
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
