import { queryOptions } from "@tanstack/react-query";
import { getActivityWeather, getTouristActivities, getTouristActivity } from "@/lib/api/activities";
import { unwrapApiResult } from "./result";

export const activityKeys = {
  all: () => ["activities"] as const,
  list: () => [...activityKeys.all(), "list"] as const,
  detail: (activityId: number | string) =>
    [...activityKeys.all(), "detail", String(activityId)] as const,
  weather: (activityId: number | string) =>
    [...activityKeys.all(), "weather", String(activityId)] as const,
};

export function touristActivitiesQueryOptions() {
  return queryOptions({
    queryKey: activityKeys.list(),
    queryFn: async () => unwrapApiResult(await getTouristActivities(), "activities"),
    staleTime: 60_000,
  });
}

export function activityWeatherQueryOptions(activityId: number | string) {
  return queryOptions({
    queryKey: activityKeys.weather(activityId),
    queryFn: async () => unwrapApiResult(await getActivityWeather(activityId), "weather"),
    staleTime: 60_000,
    retry: false,
  });
}

export function touristActivityQueryOptions(activityId: number | string) {
  return queryOptions({
    queryKey: activityKeys.detail(activityId),
    queryFn: async () => unwrapApiResult(await getTouristActivity(activityId), "activity"),
    staleTime: 60_000,
  });
}
