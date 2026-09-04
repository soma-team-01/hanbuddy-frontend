import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPost,
  readJsonBody,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import { getAdminResourceId, getAllowedAdminQuery } from "@/app/api/admin/_utils/management-route";
import type {
  AdminPageResponse,
  AdminReasonRequest,
  AdminUserActivity,
  AdminUserAgreement,
  AdminUserApplication,
  AdminUserDetail,
  AdminUserPayment,
  AdminUserReview,
  AdminUserSummary,
} from "@/types/admin";

const LIST_QUERY_KEYS = new Set([
  "userId",
  "email",
  "name",
  "displayName",
  "userType",
  "accountStatus",
  "nationalityCode",
  "joinedFrom",
  "joinedTo",
  "page",
  "size",
]);
const PAGE_QUERY_KEYS = new Set(["page", "size"]);
const HISTORY_TYPES = new Set(["activities", "applications", "payments", "reviews", "agreements"]);

type UserHistoryResult =
  | AdminPageResponse<AdminUserActivity>
  | AdminPageResponse<AdminUserApplication>
  | AdminPageResponse<AdminUserPayment>
  | AdminPageResponse<AdminUserReview>
  | AdminPageResponse<AdminUserAgreement>;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;

  if (segments.length === 0) {
    return proxyAuthenticatedGet<AdminPageResponse<AdminUserSummary>>(
      request,
      `/admin/users${getAllowedAdminQuery(request, LIST_QUERY_KEYS)}`,
      "회원 목록을 불러오지 못했습니다.",
    );
  }

  const resolvedId = getAdminResourceId(segments[0], "회원");
  if (!resolvedId.ok) return resolvedId.response;

  if (segments.length === 1) {
    return proxyAuthenticatedGet<AdminUserDetail>(
      request,
      `/admin/users/${resolvedId.id}`,
      "회원 정보를 불러오지 못했습니다.",
    );
  }

  if (segments.length === 2 && HISTORY_TYPES.has(segments[1])) {
    return proxyAuthenticatedGet<UserHistoryResult>(
      request,
      `/admin/users/${resolvedId.id}/${segments[1]}${getAllowedAdminQuery(request, PAGE_QUERY_KEYS)}`,
      "회원 이력을 불러오지 못했습니다.",
    );
  }

  return badRequestResponse("지원하지 않는 회원 관리 요청입니다.");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  const resolvedId = getAdminResourceId(segments[0], "회원");
  if (!resolvedId.ok) return resolvedId.response;
  if (segments.length !== 2 || !["suspend", "reactivate"].includes(segments[1])) {
    return badRequestResponse("지원하지 않는 회원 상태 변경 요청입니다.");
  }
  const parsed = await readJsonBody<AdminReasonRequest>(request, "변경 사유가 필요합니다.");
  if (!parsed.ok) return parsed.response;
  const reason = typeof parsed.body.reason === "string" ? parsed.body.reason.trim() : "";
  if (!reason || reason.length > 500) {
    return badRequestResponse("변경 사유를 1자 이상 500자 이하로 입력해 주세요.");
  }
  return proxyAuthenticatedPost<AdminReasonRequest, AdminUserDetail>(
    request,
    `/admin/users/${resolvedId.id}/${segments[1]}`,
    { reason },
    "회원 상태를 변경하지 못했습니다.",
  );
}
