import type {
  BuddyApplicationDetail,
  BuddyApplicationSummary,
  RejectBuddyApplicationRequest,
} from "@/types/admin";
import { requestApiResult, type ApiResult } from "./result";

export function getBuddyApplicationsForAdmin(): Promise<
  ApiResult<BuddyApplicationSummary[], "applications">
> {
  return requestApiResult(
    "/api/admin/buddy-applications",
    "applications",
    undefined,
    "버디 신청 목록을 불러오지 못했습니다.",
  );
}

export function getBuddyApplicationForAdmin(
  userId: number | string,
): Promise<ApiResult<BuddyApplicationDetail, "application">> {
  return requestApiResult(
    `/api/admin/buddy-applications/${userId}`,
    "application",
    undefined,
    "버디 신청 정보를 불러오지 못했습니다.",
  );
}

export function approveBuddyApplication(
  userId: number | string,
): Promise<ApiResult<string, "message">> {
  return requestApiResult(
    `/api/admin/buddy-applications/${userId}/approve`,
    "message",
    { method: "POST" },
    "버디 신청을 승인하지 못했습니다.",
  );
}

export function rejectBuddyApplication(
  userId: number | string,
  request: RejectBuddyApplicationRequest,
): Promise<ApiResult<string, "message">> {
  return requestApiResult(
    `/api/admin/buddy-applications/${userId}/reject`,
    "message",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "버디 신청을 거절하지 못했습니다.",
  );
}
