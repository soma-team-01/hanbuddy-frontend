import { describe, expect, it, vi } from "vitest";
import type { PaymentReadyResponse } from "@/types/application";
import { getPayPalEnvironment, getPayPalLocale, isPayPalPaymentReady } from "./paypal";

const paymentReady = {
  paymentProvider: "PAYPAL",
  paymentCurrency: "USD",
  providerOrderId: "5O190127TN364715T",
} as PaymentReadyResponse;

describe("PayPal payment helpers", () => {
  it("maps every supported site locale to a PayPal locale", () => {
    expect(getPayPalLocale("en")).toBe("en-US");
    expect(getPayPalLocale("ko")).toBe("ko-KR");
    expect(getPayPalLocale("ja")).toBe("ja-JP");
    expect(getPayPalLocale("zh-Hans")).toBe("zh-CN");
    expect(getPayPalLocale("zh-Hant")).toBe("zh-TW");
  });

  it("uses sandbox unless production is explicitly configured", () => {
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_ENVIRONMENT", "sandbox");
    expect(getPayPalEnvironment()).toBe("sandbox");
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_ENVIRONMENT", "production");
    expect(getPayPalEnvironment()).toBe("production");
    vi.unstubAllEnvs();
  });

  it("validates complete PayPal payment data without restricting the currency", () => {
    expect(isPayPalPaymentReady(paymentReady)).toBe(true);
    expect(isPayPalPaymentReady({ ...paymentReady, paymentCurrency: "EUR" })).toBe(true);
    expect(isPayPalPaymentReady({ ...paymentReady, paymentProvider: "TOSS" })).toBe(false);
    expect(isPayPalPaymentReady({ ...paymentReady, providerOrderId: "" })).toBe(false);
    expect(isPayPalPaymentReady({ ...paymentReady, paymentCurrency: "US" })).toBe(false);
  });
});
