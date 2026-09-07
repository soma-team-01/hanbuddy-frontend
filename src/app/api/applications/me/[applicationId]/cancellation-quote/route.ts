import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedGet } from "@/app/api/_utils/authenticated-backend";
import type { CancellationQuoteResponse } from "@/types/application";

export const dynamic = "force-dynamic";

interface CancellationQuoteRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function GET(request: NextRequest, context: CancellationQuoteRouteContext) {
  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  return proxyAuthenticatedGet<CancellationQuoteResponse>(
    request,
    `/applications/me/${applicationId}/cancellation-quote`,
    "취소 예상 금액 서버에 연결할 수 없습니다.",
  );
}
