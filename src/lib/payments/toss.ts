"use client";

import { ANONYMOUS, loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { Locale } from "@/i18n/routing";
import type { PaymentReadyResponse } from "@/types/application";

/** 사용자가 결제창을 직접 닫았을 때 토스 SDK가 던지는 오류 코드 */
const USER_CANCEL_CODE = "PAY_PROCESS_CANCELED";

export function isTossUserCancel(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === USER_CANCEL_CODE
  );
}

/**
 * 백엔드 결제 준비 응답으로 토스 결제창을 연다.
 * 사이트 언어와 무관하게 일반 결제창을 사용하고, 복귀 URL에만 선택한 언어를 반영한다.
 * 인증이 끝나면 successUrl(paymentKey/orderId/amount 쿼리 포함) 또는 failUrl로 리다이렉트된다.
 */
export async function requestTossPayment(
  ready: PaymentReadyResponse,
  locale: Locale,
): Promise<void> {
  if (ready.paymentProvider !== "TOSS" || !ready.clientKey) {
    throw new Error("토스 결제 준비 정보가 올바르지 않습니다.");
  }
  const tossPayments = await loadTossPayments(ready.clientKey);
  const payment = tossPayments.payment({ customerKey: ANONYMOUS });
  const origin = window.location.origin;
  const applicationId = ready.application.applicationId;

  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: ready.paymentAmount },
    orderId: ready.orderNumber,
    orderName: ready.orderName,
    successUrl: `${origin}/${locale}/payments/success?applicationId=${applicationId}`,
    failUrl: `${origin}/${locale}/payments/fail?applicationId=${applicationId}`,
  });
}
