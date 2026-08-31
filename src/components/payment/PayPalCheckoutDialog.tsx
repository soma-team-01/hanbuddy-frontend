"use client";

import { INSTANCE_LOADING_STATE, PayPalProvider, usePayPal } from "@paypal/react-paypal-js/sdk-v6";
import type {
  OneTimePaymentSession,
  OnApproveDataOneTimePayments,
  OnErrorData,
} from "@paypal/react-paypal-js/sdk-v6";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Locale } from "@/i18n/routing";
import { capturePayPalApplicationPayment, getMyApplications } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import {
  assertPayPalPaymentReady,
  getPayPalEnvironment,
  getPayPalLocale,
} from "@/lib/payments/paypal";
import { storePayPalRedirectContext } from "@/lib/payments/paypal-redirect-context";
import { unwrapApiResult } from "@/lib/query/result";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";

interface PayPalCheckoutDialogProps {
  payment: PaymentReadyResponse;
  onConfirmed: (application: ApplicationResponse) => void;
  onClose: () => void;
}

interface PayPalCheckoutButtonProps {
  payment: PaymentReadyResponse;
  onConfirmed: (application: ApplicationResponse) => void;
  onCancel?: () => void;
  autoStart?: boolean;
}

interface PayPalCheckoutActionProps extends PayPalCheckoutDialogProps {
  autoStart?: boolean;
}

function isRecoverablePayPalError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "isRecoverable" in error &&
    error.isRecoverable === true
  );
}

function PayPalCheckoutAction({
  payment,
  onConfirmed,
  onClose,
  autoStart = false,
}: Readonly<PayPalCheckoutActionProps>) {
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const t = useTranslations("PayPalPayment");
  const getApiErrorMessage = useApiErrorMessage();
  const { isHydrated, loadingStatus, sdkInstance } = usePayPal();
  const [captureError, setCaptureError] = useState<unknown>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [popupUnavailable, setPopupUnavailable] = useState(false);
  const approvalStartedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const sessionRef = useRef<OneTimePaymentSession | null>(null);

  const handleApprove = useCallback(
    async ({ orderId }: OnApproveDataOneTimePayments) => {
      approvalStartedRef.current = true;
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
        try {
          const applications = unwrapApiResult(await getMyApplications(language), "applications");
          const confirmedApplication = applications.find(
            (application) =>
              application.applicationId === payment.application.applicationId &&
              application.status === "CONFIRMED",
          );
          if (confirmedApplication) {
            onConfirmed(confirmedApplication);
            return;
          }
        } catch {
          // 캡처 오류를 우선 안내한다. 신청 목록 조회 실패로 원인을 덮어쓰지 않는다.
        }
        setCaptureError(error);
        throw error;
      } finally {
        setIsCapturing(false);
      }
    },
    [language, onConfirmed, payment.application.applicationId],
  );

  useEffect(() => {
    if (!sdkInstance) return;

    let isDisposed = false;
    let session: OneTimePaymentSession | null = null;
    try {
      session = sdkInstance.createPayPalOneTimePaymentSession({
        orderId: payment.providerOrderId,
        onApprove: handleApprove,
        onCancel: onClose,
        onError: (error: OnErrorData) => {
          if (approvalStartedRef.current) setCaptureError(error);
        },
      });
      sessionRef.current = session;
    } catch (error) {
      queueMicrotask(() => {
        if (isDisposed) return;
        setCaptureError(error);
        setPopupUnavailable(true);
      });
    }

    return () => {
      isDisposed = true;
      session?.destroy();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [handleApprove, onClose, payment.providerOrderId, sdkInstance]);

  const startPayPalCheckout = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || isStarting || isCapturing) return;

    setCaptureError(null);
    setIsStarting(true);
    approvalStartedRef.current = false;

    try {
      for (const presentationMode of ["modal", "popup"] as const) {
        try {
          await session.start({ presentationMode });
          return;
        } catch (error) {
          if (approvalStartedRef.current) {
            setCaptureError(error);
            return;
          }

          if (!isRecoverablePayPalError(error)) {
            setCaptureError(error);
            return;
          }
        }
      }

      setPopupUnavailable(true);
    } finally {
      setIsStarting(false);
    }
  }, [isCapturing, isStarting]);

  useEffect(() => {
    if (
      !autoStart ||
      autoStartAttemptedRef.current ||
      !isHydrated ||
      loadingStatus !== INSTANCE_LOADING_STATE.RESOLVED ||
      !sessionRef.current
    ) {
      return;
    }

    // Strict Mode의 첫 effect 정리에서는 실행되지 않고 실제 mount에서 한 번만 결제창을 연다.
    const timerId = window.setTimeout(() => {
      if (autoStartAttemptedRef.current) return;
      autoStartAttemptedRef.current = true;
      void startPayPalCheckout();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [autoStart, isHydrated, loadingStatus, startPayPalCheckout]);

  if (loadingStatus === INSTANCE_LOADING_STATE.PENDING) {
    return autoStart ? null : <p className="py-3 text-center text-sm text-muted">{t("loading")}</p>;
  }

  const showFallback = loadingStatus === INSTANCE_LOADING_STATE.REJECTED || popupUnavailable;

  if (autoStart && !showFallback && !captureError) return null;

  return (
    <div className="flex flex-col gap-3">
      {!showFallback && !autoStart ? (
        <paypal-button
          data-testid="paypal-sdk-button"
          className="block w-full"
          type="pay"
          aria-label="PayPal"
          disabled={!isHydrated || isStarting || isCapturing}
          onClick={() => void startPayPalCheckout()}
        />
      ) : null}

      {showFallback && payment.approvalUrl ? (
        <a
          href={payment.approvalUrl}
          onClick={() =>
            storePayPalRedirectContext({
              applicationId: String(payment.application.applicationId),
              orderId: payment.providerOrderId,
            })
          }
          className="flex h-11 items-center justify-center rounded-xl border border-line-strong font-display text-sm font-semibold text-ink transition-colors hover:border-primary hover:text-primary"
        >
          {t("redirectFallback")}
        </a>
      ) : null}

      {showFallback && !payment.approvalUrl ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger"
        >
          {t("unavailable")}
        </p>
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
        <PayPalCheckoutButton payment={payment} onConfirmed={onConfirmed} onCancel={onClose} />
      }
    />
  );
}

export function PayPalCheckoutButton({
  payment,
  onConfirmed,
  onCancel = () => undefined,
  autoStart = false,
}: Readonly<PayPalCheckoutButtonProps>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("PayPalPayment");
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

  assertPayPalPaymentReady(payment);

  if (!clientId) {
    return payment.approvalUrl ? (
      <a
        href={payment.approvalUrl}
        onClick={() =>
          storePayPalRedirectContext({
            applicationId: String(payment.application.applicationId),
            orderId: payment.providerOrderId,
          })
        }
        className="flex h-12 w-full items-center justify-center rounded-xl bg-[#ffc439] font-display text-sm font-bold text-[#111] transition-opacity hover:opacity-90"
      >
        {t("continueWithPayPal")}
      </a>
    ) : (
      <p role="alert" className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">
        {t("unavailable")}
      </p>
    );
  }

  return (
    <PayPalProvider
      clientId={clientId}
      environment={getPayPalEnvironment()}
      components={["paypal-payments"]}
      pageType="checkout"
      locale={getPayPalLocale(locale)}
    >
      <PayPalCheckoutAction
        payment={payment}
        onConfirmed={onConfirmed}
        onClose={onCancel}
        autoStart={autoStart}
      />
    </PayPalProvider>
  );
}
