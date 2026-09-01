import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPatch,
  readJsonBody,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import { getAdminResourceId, getAllowedAdminQuery } from "@/app/api/admin/_utils/management-route";
import type {
  AdminBuddyDetail,
  AdminBuddyPerformance,
  AdminBuddySummary,
  AdminCommissionUpdateRequest,
  AdminPageResponse,
} from "@/types/admin";

const LIST_QUERY_KEYS = new Set([
  "buddyId",
  "email",
  "name",
  "displayName",
  "accountStatus",
  "nationalityCode",
  "joinedFrom",
  "joinedTo",
  "page",
  "size",
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  if (segments.length === 0) {
    return proxyAuthenticatedGet<AdminPageResponse<AdminBuddySummary>>(
      request,
      `/admin/buddies${getAllowedAdminQuery(request, LIST_QUERY_KEYS)}`,
      "버디 목록을 불러오지 못했습니다.",
    );
  }
  const resolvedId = getAdminResourceId(segments[0], "버디");
  if (!resolvedId.ok) return resolvedId.response;
  if (segments.length === 1) {
    return proxyAuthenticatedGet<AdminBuddyDetail>(
      request,
      `/admin/buddies/${resolvedId.id}`,
      "버디 정보를 불러오지 못했습니다.",
    );
  }
  if (segments.length === 2 && segments[1] === "performance") {
    return proxyAuthenticatedGet<AdminBuddyPerformance>(
      request,
      `/admin/buddies/${resolvedId.id}/performance`,
      "버디 운영 성과를 불러오지 못했습니다.",
    );
  }
  return badRequestResponse("지원하지 않는 버디 관리 요청입니다.");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  const resolvedId = getAdminResourceId(segments[0], "버디");
  if (!resolvedId.ok) return resolvedId.response;
  if (segments.length !== 2 || segments[1] !== "commission") {
    return badRequestResponse("지원하지 않는 수수료 변경 요청입니다.");
  }
  const parsed = await readJsonBody<AdminCommissionUpdateRequest>(
    request,
    "수수료 정책과 변경 사유가 필요합니다.",
  );
  if (!parsed.ok) return parsed.response;
  const reason = parsed.body.reason?.trim();
  if (
    !reason ||
    reason.length > 500 ||
    !["EARLY_10", "STANDARD_20"].includes(parsed.body.commissionPolicy)
  ) {
    return badRequestResponse("수수료 정책과 500자 이하의 변경 사유를 확인해 주세요.");
  }
  return proxyAuthenticatedPatch<AdminCommissionUpdateRequest, AdminBuddyDetail>(
    request,
    `/admin/buddies/${resolvedId.id}/commission`,
    { commissionPolicy: parsed.body.commissionPolicy, reason },
    "수수료 정책을 변경하지 못했습니다.",
  );
}
