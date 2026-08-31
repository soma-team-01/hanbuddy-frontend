import type { Locale } from "@/i18n/routing";
import type { PaymentReadyResponse } from "@/types/application";

const PAYPAL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
  ja: "ja-JP",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

export function getPayPalLocale(locale: Locale): string {
  return PAYPAL_LOCALE_BY_LOCALE[locale];
}

export function getPayPalEnvironment(): "sandbox" | "production" {
  return process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production" ? "production" : "sandbox";
}

export function assertPayPalPaymentReady(ready: PaymentReadyResponse): void {
  if (
    ready.paymentProvider !== "PAYPAL" ||
    ready.paymentCurrency !== "USD" ||
    !ready.providerOrderId
  ) {
    throw new Error("PayPal 결제 준비 정보가 올바르지 않습니다.");
  }
}
