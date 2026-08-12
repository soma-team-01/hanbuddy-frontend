import type {
  ActivityPricePreviewRequest,
  ActivityPricePreviewResponse,
  ActivityUpsertRequest,
  BuddyActivityApplicationsResponse,
  BuddyDateActivityApplicationsResponse,
  BuddyScheduleDateResponse,
  MyActivityDetailResponse,
  MyActivitySummaryResponse,
} from "@/types/buddy";
import { requestApiResult, type ApiResult } from "./result";

export type MyActivitiesResult = ApiResult<MyActivitySummaryResponse[], "activities">;
export type MyActivityResult = ApiResult<MyActivityDetailResponse, "activity">;
export type ActivityPricePreviewResult = ApiResult<ActivityPricePreviewResponse, "preview">;
export type DeleteMyActivityResult = ApiResult<string, "message">;
export type BuddyScheduleDatesResult = ApiResult<BuddyScheduleDateResponse[], "dates">;
export type BuddyApplicationsResult = ApiResult<
  BuddyDateActivityApplicationsResponse[],
  "activities"
>;
export type BuddyActivityApplicationsResult = ApiResult<
  BuddyActivityApplicationsResponse,
  "applications"
>;

const DEFAULT_MY_ACTIVITIES_ERROR_MESSAGE = "내 활동 목록을 불러오지 못했습니다.";
const DEFAULT_MY_ACTIVITY_ERROR_MESSAGE = "활동 정보를 불러오지 못했습니다.";
const DEFAULT_MY_ACTIVITY_SAVE_ERROR_MESSAGE = "활동을 저장하지 못했습니다.";
const DEFAULT_ACTIVITY_PRICE_PREVIEW_ERROR_MESSAGE = "예상 정산액을 계산하지 못했습니다.";
const DEFAULT_MY_ACTIVITY_DELETE_ERROR_MESSAGE = "활동을 삭제하지 못했습니다.";
const DEFAULT_BUDDY_SCHEDULE_DATES_ERROR_MESSAGE = "활동 일정 날짜를 불러오지 못했습니다.";
const DEFAULT_BUDDY_APPLICATIONS_ERROR_MESSAGE = "신청자 목록을 불러오지 못했습니다.";

export async function getMyActivities(): Promise<MyActivitiesResult> {
  return requestApiResult<MyActivitySummaryResponse[], "activities">(
    "/api/activities/me",
    "activities",
    undefined,
    DEFAULT_MY_ACTIVITIES_ERROR_MESSAGE,
  );
}

export async function getMyActivity(activityId: number | string): Promise<MyActivityResult> {
  return requestApiResult<MyActivityDetailResponse, "activity">(
    `/api/activities/me/${activityId}`,
    "activity",
    undefined,
    DEFAULT_MY_ACTIVITY_ERROR_MESSAGE,
  );
}

export async function createMyActivity(request: ActivityUpsertRequest): Promise<MyActivityResult> {
  return requestApiResult<MyActivityDetailResponse, "activity">(
    "/api/activities",
    "activity",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_MY_ACTIVITY_SAVE_ERROR_MESSAGE,
  );
}

export async function previewActivityPrice(
  request: ActivityPricePreviewRequest,
): Promise<ActivityPricePreviewResult> {
  return requestApiResult<ActivityPricePreviewResponse, "preview">(
    "/api/activities/price-preview",
    "preview",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_ACTIVITY_PRICE_PREVIEW_ERROR_MESSAGE,
  );
}

export async function updateMyActivity(
  activityId: number | string,
  request: ActivityUpsertRequest,
): Promise<MyActivityResult> {
  return requestApiResult<MyActivityDetailResponse, "activity">(
    `/api/activities/me/${activityId}`,
    "activity",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_MY_ACTIVITY_SAVE_ERROR_MESSAGE,
  );
}

export async function deleteMyActivity(
  activityId: number | string,
): Promise<DeleteMyActivityResult> {
  return requestApiResult<string, "message">(
    `/api/activities/me/${activityId}`,
    "message",
    { method: "DELETE" },
    DEFAULT_MY_ACTIVITY_DELETE_ERROR_MESSAGE,
  );
}

export async function getBuddyScheduleDates(
  /** YYYY-MM-DD, 양 끝 포함. 생략하면 오늘부터 15일 */
  range?: { from: string; to: string },
): Promise<BuddyScheduleDatesResult> {
  const query = range ? `?from=${range.from}&to=${range.to}` : "";
  return requestApiResult<BuddyScheduleDateResponse[], "dates">(
    `/api/applications/buddy/schedule-dates${query}`,
    "dates",
    undefined,
    DEFAULT_BUDDY_SCHEDULE_DATES_ERROR_MESSAGE,
  );
}

export async function getBuddyApplications(date: string): Promise<BuddyApplicationsResult> {
  return requestApiResult<BuddyDateActivityApplicationsResponse[], "activities">(
    `/api/applications/buddy?date=${encodeURIComponent(date)}`,
    "activities",
    undefined,
    DEFAULT_BUDDY_APPLICATIONS_ERROR_MESSAGE,
  );
}

export async function getBuddyActivityApplications(
  activityScheduleId: number | string,
): Promise<BuddyActivityApplicationsResult> {
  return requestApiResult<BuddyActivityApplicationsResponse, "applications">(
    `/api/applications/buddy/schedules/${activityScheduleId}`,
    "applications",
    undefined,
    DEFAULT_BUDDY_APPLICATIONS_ERROR_MESSAGE,
  );
}
