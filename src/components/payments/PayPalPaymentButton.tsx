"use client";

import { useState } from "react";
import {
  PayPalGuestPaymentButton,
  PayPalOneTimePaymentButton,
  PayPalProvider,
} from "@paypal/react-paypal-js/sdk-v6";

interface PayPalPaymentButtonsProps {
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
      components={["paypal-payments", "paypal-guest-payments"]}
      pageType="checkout"
    >
      {children}
    </PayPalProvider>
  );
}

/**
 * 게스트 카드 결제와 PayPal 계정 결제 버튼을 함께 보여준다. 두 수단 모두 같은 order 생성/캡처 흐름을 쓴다.
 * client ID 미설정 시 비활성 안내 버튼을 대신 보여준다.
 */
export function PayPalPaymentButtons({
  createOrder,
  onApprove,
  onCancel,
  onError,
  disabled = false,
}: Readonly<PayPalPaymentButtonsProps>) {
  const [isCardCheckoutOpen, setIsCardCheckoutOpen] = useState(false);

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

  const approve = async (data: { orderId: string }) => {
    await onApprove(data);
  };

  const cancel = () => {
    setIsCardCheckoutOpen(false);
    onCancel?.();
  };

  const handleError = (error: unknown) => {
    setIsCardCheckoutOpen(false);
    onError?.(error);
  };

  return (
    <div className="flex w-full flex-row gap-2">
      <div
        className={
          isCardCheckoutOpen ? "w-full min-w-0 [&>*]:w-full" : "min-w-0 flex-1 [&>*]:w-full"
        }
        onClickCapture={() => {
          if (!disabled) setIsCardCheckoutOpen(true);
        }}
      >
        <PayPalGuestPaymentButton
          createOrder={createOrder}
          onApprove={approve}
          onCancel={cancel}
          onError={handleError}
          disabled={disabled}
        />
      </div>
      <div className={isCardCheckoutOpen ? "hidden" : "min-w-0 flex-1 [&>*]:w-full"}>
        <PayPalOneTimePaymentButton
          createOrder={createOrder}
          onApprove={approve}
          onCancel={cancel}
          onError={handleError}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
