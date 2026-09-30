import type { NextRequest } from "next/server";
import { proxyAuthenticatedPost, readJsonBody } from "@/app/api/_utils/authenticated-backend";
import type { ActivityScheduleRequest, MyActivityDetailResponse } from "@/types/buddy";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ activityId: string }> },
) {
  const parsed = await readJsonBody<ActivityScheduleRequest>(
    request,
    "일정 추가 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;
  const { activityId } = await context.params;
  return proxyAuthenticatedPost<ActivityScheduleRequest, MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}/schedules`,
    parsed.body,
    "일정 추가 서버에 연결할 수 없습니다.",
  );
}
