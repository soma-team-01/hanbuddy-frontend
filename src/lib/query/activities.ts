import { queryOptions } from "@tanstack/react-query";
import { getTouristActivities, getTouristActivity } from "@/lib/api/activities";
import { unwrapApiResult } from "./result";

export const activityKeys = {
  all: () => ["activities"] as const,
  list: () => [...activityKeys.all(), "list"] as const,
  detail: (activityId: number | string) =>
    [...activityKeys.all(), "detail", String(activityId)] as const,
};

export function touristActivitiesQueryOptions() {
  return queryOptions({
    queryKey: activityKeys.list(),
    queryFn: async () => unwrapApiResult(await getTouristActivities(), "activities"),
    staleTime: 60_000,
  });
}

export function touristActivityQueryOptions(activityId: number | string) {
  return queryOptions({
    queryKey: activityKeys.detail(activityId),
    queryFn: async () => unwrapApiResult(await getTouristActivity(activityId), "activity"),
    staleTime: 60_000,
  });
}
