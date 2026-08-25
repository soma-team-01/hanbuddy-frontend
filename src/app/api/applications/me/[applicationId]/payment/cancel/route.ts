import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPatch,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ApplicationResponse } from "@/types/application";

export const dynamic = "force-dynamic";

interface PaymentCancelRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function PATCH(request: NextRequest, context: PaymentCancelRouteContext) {
  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  // 결제 대기 신청 취소는 본문이 없다 — 좌석 선점 해제와 결제 주문 취소를 백엔드가 함께 처리한다
  return proxyAuthenticatedPatch<undefined, ApplicationResponse>(
    request,
    appendRequestedContentLanguage(request, `/applications/me/${applicationId}/payment/cancel`),
    undefined,
    "신청 취소 서버에 연결할 수 없습니다.",
  );
}
