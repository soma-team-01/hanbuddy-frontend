import { NextRequest } from "next/server";
import { proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { TouristActivityDetail } from "@/types/activity";

export const dynamic = "force-dynamic";

interface ActivityRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: ActivityRouteContext) {
  const { activityId } = await context.params;
  return proxyAuthenticatedGet<TouristActivityDetail>(
    request,
    `/activities/${activityId}`,
    "활동 상세 서버에 연결할 수 없습니다.",
  );
}
