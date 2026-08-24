import { NextRequest } from "next/server";
import { proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import type { ActivityWeatherResult } from "@/types/activity";

export const dynamic = "force-dynamic";

interface ActivityWeatherRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: ActivityWeatherRouteContext) {
  const { activityId } = await context.params;
  const backendPath = `/activities/${encodeURIComponent(activityId)}/weather`;

  return proxyPublicGet<ActivityWeatherResult>(
    request,
    backendPath,
    "활동 날씨 서버에 연결할 수 없습니다.",
  );
}
