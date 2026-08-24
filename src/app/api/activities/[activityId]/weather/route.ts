import { NextRequest } from "next/server";
import { proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import type { ActivityWeatherResult, WeatherLanguage } from "@/types/activity";

export const dynamic = "force-dynamic";

interface ActivityWeatherRouteContext {
  params: Promise<{ activityId: string }>;
}

function normalizeWeatherLanguage(value: string | null): WeatherLanguage {
  return value === "ko" ? "ko" : "en";
}

export async function GET(request: NextRequest, context: ActivityWeatherRouteContext) {
  const { activityId } = await context.params;
  const languageCode = normalizeWeatherLanguage(request.nextUrl.searchParams.get("languageCode"));
  const backendPath = `/activities/${encodeURIComponent(activityId)}/weather?languageCode=${languageCode}`;

  return proxyPublicGet<ActivityWeatherResult>(
    request,
    backendPath,
    "활동 날씨 서버에 연결할 수 없습니다.",
  );
}
