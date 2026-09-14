import { NextRequest } from "next/server";
import { badRequestResponse, proxyAuthenticatedPost } from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import { isPaymentProvider, withPaymentProvider } from "@/lib/payment-provider";
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

  const paymentProvider = request.nextUrl.searchParams.get("paymentProvider");
  if (paymentProvider !== null && !isPaymentProvider(paymentProvider)) {
    return badRequestResponse("지원하지 않는 결제수단입니다.");
  }

  const backendPath = paymentProvider
    ? withPaymentProvider(`/applications/me/${applicationId}/payment/continue`, paymentProvider)
    : `/applications/me/${applicationId}/payment/continue`;

  return proxyAuthenticatedPost<undefined, PaymentReadyResponse>(
    request,
    appendRequestedContentLanguage(request, backendPath),
    undefined,
    "결제 서버에 연결할 수 없습니다.",
  );
}
