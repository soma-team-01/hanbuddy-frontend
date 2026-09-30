import type { NextRequest } from "next/server";
import {
  proxyAuthenticatedDelete,
  proxyAuthenticatedPatch,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ActivityScheduleRequest, MyActivityDetailResponse } from "@/types/buddy";

type Context = { params: Promise<{ activityId: string; scheduleId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const parsed = await readJsonBody<ActivityScheduleRequest>(
    request,
    "일정 수정 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;
  const { activityId, scheduleId } = await context.params;
  return proxyAuthenticatedPatch<ActivityScheduleRequest, MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}/schedules/${scheduleId}`,
    parsed.body,
    "일정 수정 서버에 연결할 수 없습니다.",
  );
}

export async function DELETE(request: NextRequest, context: Context) {
  const { activityId, scheduleId } = await context.params;
  // Empty-session deletion is not cancellation and returns an updated activity, not 204.
  return proxyAuthenticatedDelete<MyActivityDetailResponse>(
    request,
    `/activities/me/${activityId}/schedules/${scheduleId}`,
    "일정 삭제 서버에 연결할 수 없습니다.",
  );
}
