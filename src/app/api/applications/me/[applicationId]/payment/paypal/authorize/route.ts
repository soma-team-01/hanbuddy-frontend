import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import type { ApplicationResponse, CapturePayPalPaymentRequest } from "@/types/application";

export const dynamic = "force-dynamic";

/** Keeps authorization, language and provider error codes inside the existing BFF boundary. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await context.params;
  if (!/^[1-9]\d*$/.test(applicationId) || !Number.isSafeInteger(Number(applicationId)))
    return badRequestResponse("잘못된 신청 ID입니다.");
  const parsed = await readJsonBody<CapturePayPalPaymentRequest>(
    request,
    "PayPal 선승인 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;
  if (!parsed.body || typeof parsed.body.orderId !== "string" || !parsed.body.orderId.trim())
    return badRequestResponse("PayPal 주문 ID가 필요합니다.");
  return proxyAuthenticatedPost<CapturePayPalPaymentRequest, ApplicationResponse>(
    request,
    appendRequestedContentLanguage(
      request,
      `/applications/me/${applicationId}/payment/paypal/authorize`,
    ),
    { orderId: parsed.body.orderId.trim() },
    "PayPal 처리 결과를 확인할 수 없습니다.",
  );
}
