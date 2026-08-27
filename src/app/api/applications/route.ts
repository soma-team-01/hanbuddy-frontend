import { NextRequest } from "next/server";
import {
  badRequestResponse,
  proxyAuthenticatedPost,
  readJsonBody,
} from "@/app/api/_utils/authenticated-backend";
import { appendRequestedContentLanguage } from "@/app/api/_utils/content-language";
import { isPaymentProvider, withPaymentProvider } from "@/lib/payment-provider";
import type { CreateApplicationRequest, PaymentReadyResponse } from "@/types/application";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const paymentProvider = request.nextUrl.searchParams.get("paymentProvider");
  if (paymentProvider !== null && !isPaymentProvider(paymentProvider)) {
    return badRequestResponse("지원하지 않는 결제수단입니다.");
  }

  const parsed = await readJsonBody<CreateApplicationRequest>(
    request,
    "신청 요청을 읽을 수 없습니다.",
  );
  if (!parsed.ok) return parsed.response;

  return proxyAuthenticatedPost<CreateApplicationRequest, PaymentReadyResponse>(
    request,
    appendRequestedContentLanguage(
      request,
      paymentProvider ? withPaymentProvider("/applications", paymentProvider) : "/applications",
    ),
    parsed.body,
    "신청 서버에 연결할 수 없습니다.",
  );
}
