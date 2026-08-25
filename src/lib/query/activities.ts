import { queryOptions } from "@tanstack/react-query";
import { getActivityWeather, getTouristActivities, getTouristActivity } from "@/lib/api/activities";
import type { ContentLanguage } from "@/types/content-language";
import { unwrapApiResult } from "./result";

export const activityKeys = {
  all: () => ["activities"] as const,
  list: (language: ContentLanguage) => [...activityKeys.all(), "list", language] as const,
  detail: (activityId: number | string, language: ContentLanguage) =>
    [...activityKeys.all(), "detail", String(activityId), language] as const,
  weather: (activityId: number | string) =>
    [...activityKeys.all(), "weather", String(activityId)] as const,
};

export function touristActivitiesQueryOptions(language: ContentLanguage) {
  return queryOptions({
    queryKey: activityKeys.list(language),
    queryFn: async () => unwrapApiResult(await getTouristActivities(language), "activities"),
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

export function touristActivityQueryOptions(
  activityId: number | string,
  language: ContentLanguage,
) {
  return queryOptions({
    queryKey: activityKeys.detail(activityId, language),
    queryFn: async () =>
      unwrapApiResult(await getTouristActivity(activityId, language), "activity"),
    staleTime: 60_000,
  });
}
