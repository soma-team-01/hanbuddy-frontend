import { describe, expect, it, vi } from "vitest";
import type { PaymentReadyResponse } from "@/types/application";
import { assertPayPalPaymentReady, getPayPalEnvironment, getPayPalLocale } from "./paypal";

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

  it("accepts only complete PayPal USD payment data", () => {
    expect(() => assertPayPalPaymentReady(paymentReady)).not.toThrow();
    expect(() => assertPayPalPaymentReady({ ...paymentReady, paymentCurrency: "KRW" })).toThrow(
      "PayPal 결제 준비 정보가 올바르지 않습니다.",
    );
  });
});
