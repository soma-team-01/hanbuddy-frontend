"use client";

import {
  INSTANCE_LOADING_STATE,
  PayPalOneTimePaymentButton,
  PayPalProvider,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Locale } from "@/i18n/routing";
import { capturePayPalApplicationPayment } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import {
  assertPayPalPaymentReady,
  getPayPalEnvironment,
  getPayPalLocale,
} from "@/lib/payments/paypal";
import { unwrapApiResult } from "@/lib/query/result";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";

interface PayPalCheckoutDialogProps {
  payment: PaymentReadyResponse;
  onConfirmed: (application: ApplicationResponse) => void;
  onClose: () => void;
}

function PayPalCheckoutAction({
  payment,
  onConfirmed,
  onClose,
}: Readonly<PayPalCheckoutDialogProps>) {
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const t = useTranslations("PayPalPayment");
  const getApiErrorMessage = useApiErrorMessage();
  const { loadingStatus } = usePayPal();
  const [captureError, setCaptureError] = useState<unknown>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING) {
    return <p className="py-3 text-center text-sm text-muted">{t("loading")}</p>;
  }

  const showFallback = loadingStatus === INSTANCE_LOADING_STATE.REJECTED;

  return (
    <div className="flex flex-col gap-3">
      {!showFallback ? (
        <PayPalOneTimePaymentButton
          type="pay"
          orderId={payment.providerOrderId}
          disabled={isCapturing}
          presentationMode="popup"
          onApprove={async ({ orderId }) => {
            setCaptureError(null);
            setIsCapturing(true);
            try {
              const application = unwrapApiResult(
                await capturePayPalApplicationPayment(
                  payment.application.applicationId,
                  { orderId },
                  language,
                ),
                "application",
              );
              if (application.status !== "CONFIRMED") {
                throw new Error("PayPal 결제 승인 결과가 확정 상태가 아닙니다.");
              }
              onConfirmed(application);
            } catch (error) {
              setCaptureError(error);
              throw error;
            } finally {
              setIsCapturing(false);
            }
          }}
          onCancel={onClose}
          onError={(error) => setCaptureError(error)}
        />
      ) : null}

      {payment.approvalUrl ? (
        <a
          href={payment.approvalUrl}
          className="flex h-11 items-center justify-center rounded-xl border border-line-strong font-display text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          {showFallback ? t("redirectFallback") : t("openInNewPage")}
        </a>
      ) : null}

      {captureError ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(captureError, t("captureFailed"))}
        </p>
      ) : null}
    </div>
  );
}

export function PayPalCheckoutDialog({
  payment,
  onConfirmed,
  onClose,
}: Readonly<PayPalCheckoutDialogProps>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("PayPalPayment");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  assertPayPalPaymentReady(payment);

  return (
    <ConfirmDialog
      title={t("title")}
      description={t("description", {
        amount: new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "USD",
        }).format(payment.paymentAmount),
      })}
      onClose={onClose}
      confirmSlot={
        clientId ? (
          <PayPalProvider
            clientId={clientId}
            environment={getPayPalEnvironment()}
            components={["paypal-payments"]}
            pageType="checkout"
            locale={getPayPalLocale(locale)}
          >
            <PayPalCheckoutAction payment={payment} onConfirmed={onConfirmed} onClose={onClose} />
          </PayPalProvider>
        ) : payment.approvalUrl ? (
          <a
            href={payment.approvalUrl}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#ffc439] font-display text-sm font-bold text-[#111] transition-opacity hover:opacity-90"
          >
            {t("continueWithPayPal")}
          </a>
        ) : (
          <p
            role="alert"
            className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger"
          >
            {t("unavailable")}
          </p>
        )
      }
    />
  );
}
