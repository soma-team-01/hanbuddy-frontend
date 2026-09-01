import type { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  requireAdmin,
} from "@/app/api/_utils/authenticated-backend";
import { getAdminResourceId, getAllowedAdminQuery } from "@/app/api/admin/_utils/management-route";
import type { AdminAuditLog, AdminPageResponse } from "@/types/admin";

const LIST_QUERY_KEYS = new Set(["targetType", "targetId", "page", "size"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ segments?: string[] }> },
) {
  const forbidden = await requireAdmin(request);
  if (forbidden) return forbidden;
  const { segments = [] } = await params;
  if (segments.length === 0) {
    return proxyAuthenticatedGet<AdminPageResponse<AdminAuditLog>>(
      request,
      `/admin/audit-logs${getAllowedAdminQuery(request, LIST_QUERY_KEYS)}`,
      "관리자 작업 이력을 불러오지 못했습니다.",
    );
  }
  const resolvedId = getAdminResourceId(segments[0], "감사 로그");
  if (!resolvedId.ok || segments.length !== 1) {
    return badRequestResponse("올바른 감사 로그 요청이 아닙니다.");
  }
  return proxyAuthenticatedGet<AdminAuditLog>(
    request,
    `/admin/audit-logs/${resolvedId.id}`,
    "관리자 작업 이력을 불러오지 못했습니다.",
  );
}
