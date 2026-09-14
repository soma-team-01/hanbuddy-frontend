const PAYPAL_REDIRECT_CONTEXT_KEY = "hanbuddy:paypal-redirect-context";

interface PayPalRedirectContext {
  applicationId: string;
  orderId: string;
}

export function storePayPalRedirectContext(context: PayPalRedirectContext): void {
  window.sessionStorage.setItem(PAYPAL_REDIRECT_CONTEXT_KEY, JSON.stringify(context));
}

export function readPayPalRedirectContext(orderId?: string): PayPalRedirectContext | null {
  const raw = window.sessionStorage.getItem(PAYPAL_REDIRECT_CONTEXT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PayPalRedirectContext>;
    if (typeof parsed.applicationId !== "string" || typeof parsed.orderId !== "string") {
      return null;
    }
    if (orderId && parsed.orderId !== orderId) return null;
    return { applicationId: parsed.applicationId, orderId: parsed.orderId };
  } catch {
    return null;
  }
}

export function clearPayPalRedirectContext(): void {
  window.sessionStorage.removeItem(PAYPAL_REDIRECT_CONTEXT_KEY);
}
