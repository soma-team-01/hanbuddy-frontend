import type {
  AdminAuditLogPageResponse,
  AdminBuddyDetail,
  AdminBuddyFilters,
  AdminBuddyPerformance,
  AdminBuddySummary,
  AdminCommissionUpdateRequest,
  AdminPageResponse,
  AdminReasonRequest,
  AdminUserDetail,
  AdminUserFilters,
  AdminUserHistory,
  AdminUserHistoryType,
  AdminUserSummary,
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

function withQuery(path: string, values: object) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value).trim());
    }
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function getAdminUsers(filters: AdminUserFilters) {
  return requestApiResult<AdminPageResponse<AdminUserSummary>, "users">(
    withQuery("/api/admin/users", filters),
    "users",
    undefined,
    "회원 목록을 불러오지 못했습니다.",
  );
}

export function getAdminUser(userId: number | string) {
  return requestApiResult<AdminUserDetail, "user">(
    `/api/admin/users/${userId}`,
    "user",
    undefined,
    "회원 정보를 불러오지 못했습니다.",
  );
}

export function getAdminUserHistory(
  userId: number | string,
  type: AdminUserHistoryType,
  page = 0,
  size = 20,
) {
  return requestApiResult<AdminPageResponse<AdminUserHistory>, "history">(
    withQuery(`/api/admin/users/${userId}/${type}`, { page, size }),
    "history",
    undefined,
    "회원 이력을 불러오지 못했습니다.",
  );
}

export function suspendAdminUser(userId: number | string, request: AdminReasonRequest) {
  return requestApiResult<AdminUserDetail, "user">(
    `/api/admin/users/${userId}/suspend`,
    "user",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "회원 계정을 정지하지 못했습니다.",
  );
}

export function reactivateAdminUser(userId: number | string, request: AdminReasonRequest) {
  return requestApiResult<AdminUserDetail, "user">(
    `/api/admin/users/${userId}/reactivate`,
    "user",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "회원 계정을 재활성화하지 못했습니다.",
  );
}

export function getAdminBuddies(filters: AdminBuddyFilters) {
  return requestApiResult<AdminPageResponse<AdminBuddySummary>, "buddies">(
    withQuery("/api/admin/buddies", filters),
    "buddies",
    undefined,
    "버디 목록을 불러오지 못했습니다.",
  );
}

export function getAdminBuddy(buddyId: number | string) {
  return requestApiResult<AdminBuddyDetail, "buddy">(
    `/api/admin/buddies/${buddyId}`,
    "buddy",
    undefined,
    "버디 정보를 불러오지 못했습니다.",
  );
}

export function getAdminBuddyPerformance(buddyId: number | string) {
  return requestApiResult<AdminBuddyPerformance, "performance">(
    `/api/admin/buddies/${buddyId}/performance`,
    "performance",
    undefined,
    "버디 운영 성과를 불러오지 못했습니다.",
  );
}

export function updateAdminBuddyCommission(
  buddyId: number | string,
  request: AdminCommissionUpdateRequest,
) {
  return requestApiResult<AdminBuddyDetail, "buddy">(
    `/api/admin/buddies/${buddyId}/commission`,
    "buddy",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "버디 수수료 정책을 변경하지 못했습니다.",
  );
}

export function getAdminAuditLogs(targetId: number | string, page = 0, size = 20) {
  return requestApiResult<AdminAuditLogPageResponse, "auditLogs">(
    withQuery("/api/admin/audit-logs", { targetType: "USER", targetId, page, size }),
    "auditLogs",
    undefined,
    "관리자 작업 이력을 불러오지 못했습니다.",
  );
}
