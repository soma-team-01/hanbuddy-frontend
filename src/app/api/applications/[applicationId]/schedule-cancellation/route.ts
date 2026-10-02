import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { ScheduleCancellationApplicant } from "@/types/schedule-cancellation";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  if (!/^[1-9]\d*$/.test(applicationId)) return badRequestResponse("잘못된 신청 ID입니다.");
  return proxyAuthenticatedGet<ScheduleCancellationApplicant>(
    request,
    `/applications/${applicationId}/schedule-cancellation`,
    "환불 진행 서버에 연결할 수 없습니다.",
  );
}
