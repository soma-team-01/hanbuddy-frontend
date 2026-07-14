import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import type { ApplicationResponse, CapturePaymentRequest } from "@/types/application";

export const dynamic = "force-dynamic";

interface PaymentRouteContext {
  params: Promise<{ applicationId: string }>;
}

export async function POST(request: NextRequest, context: PaymentRouteContext) {
  const parsed = await readJsonBody<CapturePaymentRequest>(
    request,
    "결제 캡처 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  const { applicationId } = await context.params;
  if (!/^\d+$/.test(applicationId)) {
    return badRequestResponse("잘못된 신청 ID입니다.");
  }

  return proxyAuthenticatedPost<CapturePaymentRequest, ApplicationResponse>(
    request,
    `/applications/me/${applicationId}/payment/capture`,
    parsed.body,
    "결제 서버에 연결할 수 없습니다.",
  );
}
