import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedPost } from "@/app/api/_utils/authenticated-backend";
import type { PaymentReadyResponse } from "@/types/application";

export const dynamic = "force-dynamic";

interface PaymentRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: NextRequest, context: PaymentRouteContext) {
  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  return proxyAuthenticatedPost<undefined, PaymentReadyResponse>(
    request,
    `/applications/me/${applicationId}/payment/continue`,
    undefined,
    "결제 서버에 연결할 수 없습니다.",
  );
}
