import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ApplicationResponse, CapturePayPalPaymentRequest } from "@/types/application";

export const dynamic = "force-dynamic";

interface PaymentRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: NextRequest, context: PaymentRouteContext) {
  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  const parsed = await readJsonBody<CapturePayPalPaymentRequest>(
    request,
    "PayPal 결제 승인 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;
  if (typeof parsed.body.orderId !== "string" || !parsed.body.orderId.trim()) {
    return badRequestResponse("PayPal 주문 ID가 필요합니다.");
  }

  return proxyAuthenticatedPost<CapturePayPalPaymentRequest, ApplicationResponse>(
    request,
    appendRequestedContentLanguage(
      request,
      `/applications/me/${applicationId}/payment/paypal/capture`,
    ),
    { orderId: parsed.body.orderId.trim() },
    "PayPal 결제 서버에 연결할 수 없습니다.",
  );
}
