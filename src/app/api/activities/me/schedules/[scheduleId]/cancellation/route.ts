import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedGet,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ScheduleCancellationResponse } from "@/types/schedule-cancellation";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ scheduleId: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { scheduleId } = await context.params;
  if (!/^[1-9]\d*$/.test(scheduleId)) return badRequestResponse("잘못된 일정 ID입니다.");
  return proxyAuthenticatedGet<ScheduleCancellationResponse>(
    request,
    `/activities/me/schedules/${scheduleId}/cancellation`,
    "일정 취소 서버에 연결할 수 없습니다.",
  );
}

export async function POST(request: NextRequest, context: Context) {
  const { scheduleId } = await context.params;
  if (!/^[1-9]\d*$/.test(scheduleId)) return badRequestResponse("잘못된 일정 ID입니다.");
  const parsed = await readJsonBody<{ reason?: unknown }>(request, "취소 사유를 읽을 수 없습니다.");
  if (!parsed.ok) return parsed.response;
  const reason = typeof parsed.body.reason === "string" ? parsed.body.reason.trim() : "";
  if (!reason || reason.length > 255) return badRequestResponse("취소 사유는 1~255자여야 합니다.");
  return proxyAuthenticatedPost<{ reason: string }, ScheduleCancellationResponse>(
    request,
    `/activities/me/schedules/${scheduleId}/cancellation`,
    { reason },
    "일정 취소 서버에 연결할 수 없습니다.",
  );
}
