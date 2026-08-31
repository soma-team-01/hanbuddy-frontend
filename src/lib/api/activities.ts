import type {
  ActivityWeatherResult,
  TouristActivityDetail,
  TouristActivitySummary,
} from "@/types/activity";
import { withContentLanguage } from "@/lib/content-language";
import { withDisplayCurrency } from "@/lib/display-currency";
import type { ContentLanguage } from "@/types/content-language";
import type { DisplayCurrency } from "@/types/display-currency";
import { requestApiResult, type ApiResult } from "./result";

export type TouristActivitiesResult = ApiResult<TouristActivitySummary[], "activities">;
export type TouristActivityResult = ApiResult<TouristActivityDetail, "activity">;
export type ActivityWeatherApiResult = ApiResult<ActivityWeatherResult, "weather">;

const DEFAULT_ACTIVITY_LIST_ERROR_MESSAGE = "활동 목록을 불러오지 못했습니다.";
const DEFAULT_ACTIVITY_DETAIL_ERROR_MESSAGE = "활동 상세를 불러오지 못했습니다.";
const DEFAULT_ACTIVITY_WEATHER_ERROR_MESSAGE = "활동 날씨를 불러오지 못했습니다.";

export async function getTouristActivities(
  language: ContentLanguage,
  displayCurrency: DisplayCurrency = "KRW",
): Promise<TouristActivitiesResult> {
  return requestApiResult<TouristActivitySummary[], "activities">(
    withDisplayCurrency(withContentLanguage("/api/activities", language), displayCurrency),
    "activities",
    undefined,
    DEFAULT_ACTIVITY_LIST_ERROR_MESSAGE,
  );
}

export async function getTouristActivity(
  activityId: number | string,
  language: ContentLanguage,
  displayCurrency: DisplayCurrency = "KRW",
): Promise<TouristActivityResult> {
  return requestApiResult<TouristActivityDetail, "activity">(
    withDisplayCurrency(
      withContentLanguage(`/api/activities/${activityId}`, language),
      displayCurrency,
    ),
    "activity",
    undefined,
    DEFAULT_ACTIVITY_DETAIL_ERROR_MESSAGE,
  );
}

export async function getActivityWeather(
  activityId: number | string,
): Promise<ActivityWeatherApiResult> {
  return requestApiResult<ActivityWeatherResult, "weather">(
    `/api/activities/${activityId}/weather`,
    "weather",
    undefined,
    DEFAULT_ACTIVITY_WEATHER_ERROR_MESSAGE,
  );
}
