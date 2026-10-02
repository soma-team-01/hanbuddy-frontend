import type {
  ScheduleCancellationApplicant,
  ScheduleCancellationResponse,
} from "@/types/schedule-cancellation";
import { requestApiResult } from "./result";

export function cancelSchedule(scheduleId: number | string, reason: string) {
  return requestApiResult<ScheduleCancellationResponse, "cancellation">(
    `/api/activities/me/schedules/${scheduleId}/cancellation`,
    "cancellation",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    },
    "일정 취소 요청을 확인하지 못했습니다.",
  );
}

export function getScheduleCancellation(scheduleId: number | string) {
  return requestApiResult<ScheduleCancellationResponse, "cancellation">(
    `/api/activities/me/schedules/${scheduleId}/cancellation`,
    "cancellation",
    undefined,
    "일정 취소 상태를 불러오지 못했습니다.",
  );
}

export function getApplicationScheduleCancellation(applicationId: number | string) {
  return requestApiResult<ScheduleCancellationApplicant, "cancellation">(
    `/api/applications/${applicationId}/schedule-cancellation`,
    "cancellation",
    undefined,
    "환불 진행 상태를 불러오지 못했습니다.",
  );
}
