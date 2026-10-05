import { NextRequest } from "next/server";
import { proxyPublicGet } from "@/app/api/_utils/authenticated-backend";
import type { ActivityLanguage } from "@/types/activity-language";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return proxyPublicGet<ActivityLanguage[]>(
    request,
    "/activities/languages",
    "진행 언어를 불러오지 못했습니다.",
  );
}
