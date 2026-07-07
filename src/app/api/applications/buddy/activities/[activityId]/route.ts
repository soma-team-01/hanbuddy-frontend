import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyActivityApplicationsResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

interface BuddyActivityApplicationsRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: BuddyActivityApplicationsRouteContext) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) return badRequestResponse("조회 날짜가 필요합니다.");

  const { activityId } = await context.params;
  return proxyAuthenticatedGet<BuddyActivityApplicationsResponse>(
    request,
    `/applications/buddy/activities/${activityId}?date=${encodeURIComponent(date)}`,
    "버디 활동 신청자 상세 서버에 연결할 수 없습니다.",
  );
}
