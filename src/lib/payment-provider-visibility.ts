import type { PaymentProvider } from "@/types/application";

export type PaymentProviderMode = PaymentProvider | "BOTH";

export function resolvePaymentProviderMode(value: string | undefined): PaymentProviderMode {
  if (value === "TOSS" || value === "PAYPAL" || value === "BOTH") {
    return value;
  }
  return "BOTH";
}

export const PAYMENT_PROVIDER_MODE = resolvePaymentProviderMode(
  process.env.NEXT_PUBLIC_PAYMENT_PROVIDER,
);

export function isPaymentProviderVisible(
  provider: PaymentProvider,
  mode: PaymentProviderMode = PAYMENT_PROVIDER_MODE,
): boolean {
  return mode === "BOTH" || mode === provider;
}
