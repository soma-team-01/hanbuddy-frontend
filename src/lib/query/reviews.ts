import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getActivityReviews, getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { unwrapApiResult } from "./result";

/** 미리보기·캐러셀은 한 번에 6건씩 불러온다 */
export const REVIEW_PAGE_SIZE = 6;

export const reviewKeys = {
  all: () => ["reviews"] as const,
  activity: (activityId: number | string) =>
    [...reviewKeys.all(), "activity", String(activityId)] as const,
  buddy: (buddyId: number | string) => [...reviewKeys.all(), "buddy", String(buddyId)] as const,
};

export const buddyKeys = {
  all: () => ["buddies"] as const,
  profile: (buddyId: number | string) => [...buddyKeys.all(), String(buddyId)] as const,
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
    queryKey: buddyKeys.profile(buddyId),
    queryFn: async () => unwrapApiResult(await getBuddyProfile(buddyId), "buddy"),
    staleTime: 60_000,
  });
}
