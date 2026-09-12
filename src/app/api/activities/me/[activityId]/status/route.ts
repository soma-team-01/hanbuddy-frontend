import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ActivityStatusUpdateRequest, MyActivityDetailResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

interface ActivityStatusRouteContext {
  params: Promise<{ activityId: string }>;
}

function isStatusUpdateRequest(value: unknown): value is ActivityStatusUpdateRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const status = (value as { status?: unknown }).status;
  return status === "ACTIVE" || status === "INACTIVE";
}

export async function PATCH(request: NextRequest, context: ActivityStatusRouteContext) {
  const parsed = await readJsonBody<unknown>(request, "활동 공개 상태 요청을 읽을 수 없습니다.");
  if (!parsed.ok) return parsed.response;

  const { activityId } = await context.params;
  if (!/^\d+$/.test(activityId)) {
    return badRequestResponse("잘못된 활동 ID입니다.");
  }
  if (!isStatusUpdateRequest(parsed.body)) {
    return badRequestResponse("공개 상태는 ACTIVE 또는 INACTIVE여야 합니다.");
  }

  return proxyAuthenticatedPatch<ActivityStatusUpdateRequest, MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}/status`,
    parsed.body,
    "활동 공개 상태 서버에 연결할 수 없습니다.",
  );
}
