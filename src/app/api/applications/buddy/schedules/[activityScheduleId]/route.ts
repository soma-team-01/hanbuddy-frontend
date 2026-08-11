import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { BuddyActivityApplicationsResponse } from "@/types/buddy";

export const dynamic = "force-dynamic";

interface BuddyScheduleApplicationsRouteContext {
  params: Promise<{ activityScheduleId: string }>;
}

export async function GET(request: NextRequest, context: BuddyScheduleApplicationsRouteContext) {
  const { activityScheduleId } = await context.params;
  if (!/^\d+$/.test(activityScheduleId)) {
    return badRequestResponse("잘못된 활동 회차 ID입니다.");
  }

  return proxyAuthenticatedGet<BuddyActivityApplicationsResponse>(
    request,
    `/applications/buddy/schedules/${activityScheduleId}`,
    "버디 활동 신청자 상세 서버에 연결할 수 없습니다.",
  );
}
