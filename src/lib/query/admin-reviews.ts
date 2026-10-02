import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  getAdminReview,
  getAdminReviews,
  getAdminReviewTranslations,
} from "@/lib/api/admin-reviews";
import type { AdminReview, AdminReviewFilters } from "@/types/admin-review";
import { unwrapApiResult } from "./result";
import { adminKeys } from "./admin";
import { reviewKeys, buddyProfileKeys } from "./reviews";
import { activityKeys } from "./activities";

export const adminReviewKeys = {
  all: ["admin", "reviews"] as const,
  list: (filters: AdminReviewFilters) => ["admin", "reviews", "list", filters] as const,
  detail: (id: number | string) => ["admin", "reviews", String(id)] as const,
  translations: (id: number | string) => ["admin", "reviews", String(id), "translations"] as const,
};
export function adminReviewsQueryOptions(filters: AdminReviewFilters) {
  return queryOptions({
    queryKey: adminReviewKeys.list(filters),
    queryFn: async () => unwrapApiResult(await getAdminReviews(filters), "reviews"),
  });
}
export function adminReviewQueryOptions(id: number | string) {
  return queryOptions({
    queryKey: adminReviewKeys.detail(id),
    queryFn: async () => unwrapApiResult(await getAdminReview(id), "review"),
    gcTime: 0,
  });
}
export function adminReviewTranslationsQueryOptions(id: number | string) {
  return queryOptions({
    queryKey: adminReviewKeys.translations(id),
    queryFn: async () => unwrapApiResult(await getAdminReviewTranslations(id), "translations"),
    gcTime: 0,
  });
}
export async function invalidateAdminReviewChange(client: QueryClient, review: AdminReview) {
  await Promise.all(
    [
      adminKeys.all,
      reviewKeys.activity(review.activityId),
      reviewKeys.buddy(review.buddyId),
      buddyProfileKeys.profile(review.buddyId),
      activityKeys.all(),
    ].map((queryKey) => client.invalidateQueries({ queryKey })),
  );
}
