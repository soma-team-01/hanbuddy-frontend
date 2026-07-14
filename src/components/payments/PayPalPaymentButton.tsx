"use client";

import { PayPalOneTimePaymentButton, PayPalProvider } from "@paypal/react-paypal-js/sdk-v6";

interface PayPalPaymentButtonProps {
  createOrder: () => Promise<{ orderId: string }>;
  onApprove: (data: { orderId: string }) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
  disabled?: boolean;
}

function getPayPalClientId() {
  return process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
}

/** PayPal SDK 컨텍스트. client ID가 없으면 SDK를 로드하지 않고 자식만 렌더링한다. */
export function PayPalPaymentProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const clientId = getPayPalClientId();
  if (!clientId) return children;

  return (
    <PayPalProvider
      clientId={clientId}
      environment={
        process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "live" ||
        process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === "production"
          ? "production"
          : "sandbox"
      }
      components={["paypal-payments"]}
      pageType="checkout"
    >
      {children}
    </PayPalProvider>
  );
}

/** PayPal 승인 팝업을 여는 결제 버튼. client ID 미설정 시 비활성 안내 버튼을 대신 보여준다. */
export function PayPalPaymentButton({
  createOrder,
  onApprove,
  onCancel,
  onError,
  disabled = false,
}: Readonly<PayPalPaymentButtonProps>) {
  if (!getPayPalClientId()) {
    return (
      <button
        type="button"
        disabled
        className="h-12 w-full cursor-not-allowed rounded-xl bg-forest font-display text-sm font-semibold text-cream opacity-40"
      >
        Payment unavailable
      </button>
    );
  }

  return (
    <PayPalOneTimePaymentButton
      createOrder={createOrder}
      onApprove={async (data) => {
        await onApprove(data);
      }}
      onCancel={onCancel}
      onError={onError}
      disabled={disabled}
    />
  );
}
