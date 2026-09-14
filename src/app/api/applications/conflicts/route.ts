import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ApplicationConflictCheckResponse } from "@/types/application";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const activityScheduleId = request.nextUrl.searchParams.get("activityScheduleId");
  if (!activityScheduleId || !/^\d+$/.test(activityScheduleId) || Number(activityScheduleId) <= 0) {
    return badRequestResponse("확인할 활동 일정이 필요합니다.");
  }

  return proxyAuthenticatedGet<ApplicationConflictCheckResponse>(
    request,
    appendRequestedContentLanguage(
      request,
      `/applications/conflicts?activityScheduleId=${encodeURIComponent(activityScheduleId)}`,
    ),
    "예약 일정 확인 서버에 연결할 수 없습니다.",
  );
}
