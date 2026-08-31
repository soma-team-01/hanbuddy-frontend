import { queryOptions } from "@tanstack/react-query";
import { getActivityWeather, getTouristActivities, getTouristActivity } from "@/lib/api/activities";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { unwrapApiResult } from "./result";

export const activityKeys = {
  all: () => ["activities"] as const,
  list: (language: ContentLanguage, displayCurrency: DisplayCurrency = "KRW") =>
    [...activityKeys.all(), "list", language, displayCurrency] as const,
  detail: (
    activityId: number | string,
    language: ContentLanguage,
    displayCurrency: DisplayCurrency = "KRW",
  ) => [...activityKeys.all(), "detail", String(activityId), language, displayCurrency] as const,
  weather: (activityId: number | string) =>
    [...activityKeys.all(), "weather", String(activityId)] as const,
};

export function touristActivitiesQueryOptions(
  language: ContentLanguage,
  displayCurrency: DisplayCurrency = "KRW",
) {
  return queryOptions({
    queryKey: activityKeys.list(language, displayCurrency),
    queryFn: async () =>
      unwrapApiResult(await getTouristActivities(language, displayCurrency), "activities"),
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
  displayCurrency: DisplayCurrency = "KRW",
) {
  return queryOptions({
    queryKey: activityKeys.detail(activityId, language, displayCurrency),
    queryFn: async () =>
      unwrapApiResult(await getTouristActivity(activityId, language, displayCurrency), "activity"),
    staleTime: 60_000,
  });
}
