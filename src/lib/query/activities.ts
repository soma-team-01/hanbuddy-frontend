import { queryOptions } from "@tanstack/react-query";
import {
  getActivityWeather,
  getTouristActivities,
  getTouristActivity,
  getActivityPriceQuote,
} from "@/lib/api/activities";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { unwrapApiResult } from "./result";

export const activityKeys = {
  all: () => ["activities"] as const,
  quote: (activityId: number | string, guestCount: number) =>
    ["activities", "price-quote", String(activityId), guestCount] as const,
  list: (language: ContentLanguage, displayCurrency: DisplayCurrency = "KRW", date?: string) =>
    [...activityKeys.all(), "list", language, displayCurrency, date || null] as const,
  detail: (
    activityId: number | string,
    language: ContentLanguage,
    displayCurrency: DisplayCurrency = "KRW",
  ) => [...activityKeys.all(), "detail", String(activityId), language, displayCurrency] as const,
  weather: (activityId: number | string) =>
    [...activityKeys.all(), "weather", String(activityId)] as const,
};

export function activityPriceQuoteQueryOptions(activityId: number | string, guestCount: number) {
  return queryOptions({
    queryKey: activityKeys.quote(activityId, guestCount),
    queryFn: async ({ signal }) => {
      const quote = unwrapApiResult(
        await getActivityPriceQuote(activityId, guestCount, signal),
        "quote",
      );
      if (
        !quote ||
        String(quote.activityId) !== String(activityId) ||
        quote.guestCount !== guestCount ||
        quote.currency !== "KRW" ||
        quote.amount <= 0 ||
        quote.unitPrice <= 0 ||
        [
          quote.amount,
          quote.unitPrice,
          quote.originalUnitPrice,
          quote.originalAmount,
          quote.quantityUnitPrice,
          quote.discountAmount,
          quote.quantityDiscountAmount,
          quote.periodDiscountAmount,
        ].some((amount) => !Number.isSafeInteger(amount) || amount < 0)
      ) {
        throw new Error("Invalid activity price quote");
      }
      return quote;
    },
    staleTime: 0,
    retry: false,
  });
}

export function touristActivitiesQueryOptions(
  language: ContentLanguage,
  displayCurrency: DisplayCurrency = "KRW",
  date?: string,
) {
  return queryOptions({
    queryKey: activityKeys.list(language, displayCurrency, date),
    queryFn: async () =>
      unwrapApiResult(
        await (date
          ? getTouristActivities(language, displayCurrency, date)
          : getTouristActivities(language, displayCurrency)),
        "activities",
      ),
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
