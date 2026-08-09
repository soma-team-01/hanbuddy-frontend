import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ApplicationResponse, ConfirmPaymentRequest } from "@/types/application";

export const dynamic = "force-dynamic";

interface PaymentRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: NextRequest, context: PaymentRouteContext) {
  const parsed = await readJsonBody<ConfirmPaymentRequest>(
    request,
    "결제 승인 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  const { paymentKey, orderId, amount } = parsed.body;
  if (typeof paymentKey !== "string" || paymentKey.trim().length === 0) {
    return badRequestResponse("paymentKey가 필요합니다.");
  }
  if (typeof orderId !== "string" || orderId.trim().length === 0) {
    return badRequestResponse("orderId가 필요합니다.");
  }
  // 백엔드 계약상 결제 금액은 KRW 정수다
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return badRequestResponse("amount가 필요합니다.");
  }

  return proxyAuthenticatedPost<ConfirmPaymentRequest, ApplicationResponse>(
    request,
    `/applications/me/${applicationId}/payment/confirm`,
    parsed.body,
    "결제 서버에 연결할 수 없습니다.",
  );
}
