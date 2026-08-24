import type {
  ActivityWeatherResult,
  TouristActivityDetail,
  TouristActivitySummary,
  WeatherLanguage,
} from "@/types/activity";
import { requestApiResult, type ApiResult } from "./result";

export type TouristActivitiesResult = ApiResult<TouristActivitySummary[], "activities">;
export type TouristActivityResult = ApiResult<TouristActivityDetail, "activity">;
export type ActivityWeatherApiResult = ApiResult<ActivityWeatherResult, "weather">;

const DEFAULT_ACTIVITY_LIST_ERROR_MESSAGE = "활동 목록을 불러오지 못했습니다.";
const DEFAULT_ACTIVITY_DETAIL_ERROR_MESSAGE = "활동 상세를 불러오지 못했습니다.";
const DEFAULT_ACTIVITY_WEATHER_ERROR_MESSAGE = "활동 날씨를 불러오지 못했습니다.";

export async function getTouristActivities(): Promise<TouristActivitiesResult> {
  return requestApiResult<TouristActivitySummary[], "activities">(
    "/api/activities",
    "activities",
    undefined,
    DEFAULT_ACTIVITY_LIST_ERROR_MESSAGE,
  );
}

export async function getTouristActivity(
  activityId: number | string,
): Promise<TouristActivityResult> {
  return requestApiResult<TouristActivityDetail, "activity">(
    `/api/activities/${activityId}`,
    "activity",
    undefined,
    DEFAULT_ACTIVITY_DETAIL_ERROR_MESSAGE,
  );
}

export async function getActivityWeather(
  activityId: number | string,
  languageCode: WeatherLanguage,
): Promise<ActivityWeatherApiResult> {
  const params = new URLSearchParams({ languageCode });
  return requestApiResult<ActivityWeatherResult, "weather">(
    `/api/activities/${activityId}/weather?${params.toString()}`,
    "weather",
    undefined,
    DEFAULT_ACTIVITY_WEATHER_ERROR_MESSAGE,
  );
}
