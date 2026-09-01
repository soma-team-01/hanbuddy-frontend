import { NextRequest } from "next/server";
import { proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedActivityDisplayOptions } from "@/app/api/_utils/content-language";
import type { TouristActivityDetail } from "@/types/activity";

export const dynamic = "force-dynamic";

interface ActivityRouteContext {
  params: Promise<{ activityId: string }>;
}

export async function GET(request: NextRequest, context: ActivityRouteContext) {
  const { activityId } = await context.params;
  return proxyPublicGet<TouristActivityDetail>(
    request,
    appendRequestedActivityDisplayOptions(request, `/activities/${encodeURIComponent(activityId)}`),
    "활동 상세 서버에 연결할 수 없습니다.",
  );
}
