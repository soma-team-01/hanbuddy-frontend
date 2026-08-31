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

export function isPayPalPaymentReady(ready: PaymentReadyResponse): boolean {
  return (
    ready.paymentProvider === "PAYPAL" &&
    ready.providerOrderId.trim().length > 0 &&
    /^[A-Z]{3}$/.test(ready.paymentCurrency)
  );
}
