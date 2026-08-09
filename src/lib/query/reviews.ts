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

export function activityReviewsQueryOptions(
  activityId: number | string,
  size: number = REVIEW_PAGE_SIZE,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.activity(activityId), size],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(await getActivityReviews(activityId, pageParam, size), "reviews"),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    staleTime: 60_000,
  });
}

export function buddyReviewsQueryOptions(
  buddyId: number | string,
  size: number = REVIEW_PAGE_SIZE,
) {
  return infiniteQueryOptions({
    queryKey: [...reviewKeys.buddy(buddyId), size],
    queryFn: async ({ pageParam }) =>
      unwrapApiResult(await getBuddyReviews(buddyId, pageParam, size), "reviews"),
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
