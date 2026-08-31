import type { PaymentProvider } from "@/types/application";

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === "TOSS" || value === "PAYPAL";
}

export function withPaymentProvider(path: string, provider: PaymentProvider): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}paymentProvider=${provider}`;
}
