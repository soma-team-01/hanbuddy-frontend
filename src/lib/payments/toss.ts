"use client";

import { ANONYMOUS, loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { Locale } from "@/i18n/routing";
import type { PaymentReadyResponse } from "@/types/application";

// showEstimatedAmount는 SDK 타입에 아직 없지만 다국어 결제창이 지원하는 옵션이다.
// USD 환산 예상 결제 금액 표시를 끈다 (카드사 환율과 달라 혼동 방지).
const INTERNATIONAL_CARD_OPTIONS = {
  useInternationalCardOnly: true,
  showEstimatedAmount: false,
};

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
 * 인증이 끝나면 successUrl(paymentKey/orderId/amount 쿼리 포함) 또는 failUrl로 리다이렉트된다.
 */
export async function requestTossPayment(
  ready: PaymentReadyResponse,
  locale: Locale,
): Promise<void> {
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
    // 한국어 외 로케일은 다국어 결제창(해외카드 전용, 한/영/중/일 지원)을 연다.
    // 국내 결제창은 언어 옵션이 없어 한국어로만 표시된다.
    card: locale === "ko" ? undefined : INTERNATIONAL_CARD_OPTIONS,
  });
}
