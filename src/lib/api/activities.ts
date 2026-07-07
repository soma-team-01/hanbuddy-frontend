import type { TouristActivityDetail, TouristActivitySummary } from "@/types/activity";
import { requestApiResult, type ApiResult } from "./result";

export type TouristActivitiesResult = ApiResult<TouristActivitySummary[], "activities">;
export type TouristActivityResult = ApiResult<TouristActivityDetail, "activity">;

const DEFAULT_ACTIVITY_LIST_ERROR_MESSAGE = "활동 목록을 불러오지 못했습니다.";
const DEFAULT_ACTIVITY_DETAIL_ERROR_MESSAGE = "활동 상세를 불러오지 못했습니다.";

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
