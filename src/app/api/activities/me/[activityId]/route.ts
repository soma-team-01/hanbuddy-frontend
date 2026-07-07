import { NextRequest } from "next/server";
import {
  proxyAuthenticatedDelete,
  proxyAuthenticatedGet,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ActivityUpsertRequest, MyActivityDetailResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

interface MyActivityRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: MyActivityRouteContext) {
  const { activityId } = await context.params;
  return proxyAuthenticatedGet<MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}`,
    "내 활동 상세 서버에 연결할 수 없습니다.",
  );
}

export async function PATCH(request: NextRequest, context: MyActivityRouteContext) {
  const parsed = await readJsonBody<ActivityUpsertRequest>(
    request,
    "활동 수정 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  const { activityId } = await context.params;
  return proxyAuthenticatedPatch<ActivityUpsertRequest, MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}`,
    parsed.body,
    "활동 수정 서버에 연결할 수 없습니다.",
  );
}

export async function DELETE(request: NextRequest, context: MyActivityRouteContext) {
  const { activityId } = await context.params;
  return proxyAuthenticatedDelete<string>(
    request,
    `/activities/me/${activityId}`,
    "활동 삭제 서버에 연결할 수 없습니다.",
  );
}
