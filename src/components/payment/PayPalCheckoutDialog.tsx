"use client";
import { isPayPalCheckoutReceived } from "@/lib/payments/paypal-authorization";

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
import {
  authorizePayPalApplicationPayment,
  capturePayPalApplicationPayment,
  getMyApplications,
} from "@/lib/api/applications";
import { Link } from "@/i18n/navigation";
import { createApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { getPayPalEnvironment, getPayPalLocale, isPayPalPaymentReady } from "@/lib/payments/paypal";
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
  const authorization = useTranslations("PayPalAuthorization");
  const getApiErrorMessage = useApiErrorMessage();
  const { isHydrated, loadingStatus, sdkInstance } = usePayPal();
  const [captureError, setCaptureError] = useState<unknown>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [popupUnavailable, setPopupUnavailable] = useState(false);
  const approvalStartedRef = useRef(false);
  const autoStartAttemptedRef = useRef(false);
  const sessionRef = useRef<OneTimePaymentSession | null>(null);
  const approvalAttemptRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const [approvalAttempted, setApprovalAttempted] = useState(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleApprove = useCallback(
    ({ orderId }: OnApproveDataOneTimePayments) => {
      if (approvalAttemptRef.current) return approvalAttemptRef.current;
      const complete = async () => {
        approvalStartedRef.current = true;
        setApprovalAttempted(true);
        setCaptureError(null);
        setIsCapturing(true);
        try {
          if (orderId !== payment.providerOrderId) throw new Error("PayPal order mismatch");
          const submit =
            payment.paypalIntent === "AUTHORIZE"
              ? authorizePayPalApplicationPayment
              : capturePayPalApplicationPayment;
          const application = unwrapApiResult(
            await submit(payment.application.applicationId, { orderId }, language),
            "application",
          );
          if (
            application.applicationId !== payment.application.applicationId ||
            !isPayPalCheckoutReceived(application)
          ) {
            throw new Error("PayPal 결제 승인 결과가 확정 상태가 아닙니다.");
          }
          if (mountedRef.current) onConfirmed(application);
        } catch (error) {
          let resolvedError = error;
          try {
            const applications = unwrapApiResult(await getMyApplications(language), "applications");
            const confirmedApplication = applications.find(
              (application) => application.applicationId === payment.application.applicationId,
            );
            if (confirmedApplication && isPayPalCheckoutReceived(confirmedApplication)) {
              if (mountedRef.current) onConfirmed(confirmedApplication);
              return;
            }
            if (confirmedApplication?.cancellationReason === "PAYMENT_FAILED") {
              resolvedError = createApiClientError(409, {
                isSuccess: false,
                code: "PAYMENT409_PAYPAL_DECLINED",
                message: "Payment declined",
              });
            }
          } catch {
            // 캡처 오류를 우선 안내한다. 신청 목록 조회 실패로 원인을 덮어쓰지 않는다.
          }
          if (mountedRef.current) setCaptureError(resolvedError);
          throw resolvedError;
        } finally {
          if (mountedRef.current) setIsCapturing(false);
        }
      };
      approvalAttemptRef.current = complete();
      return approvalAttemptRef.current;
    },
    [
      language,
      onConfirmed,
      payment.application.applicationId,
      payment.paypalIntent,
      payment.providerOrderId,
    ],
  );

  useEffect(() => {
    if (!sdkInstance) return;

    let isDisposed = false;
    let session: OneTimePaymentSession | null = null;
    try {
      session = sdkInstance.createPayPalOneTimePaymentSession({
        orderId: payment.providerOrderId,
        onApprove: handleApprove,
        onCancel: () => {
          if (!approvalStartedRef.current) onClose();
        },
        onError: (error: OnErrorData) => {
          if (approvalStartedRef.current && mountedRef.current)
            setCaptureError((current: unknown) => current ?? error);
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
    if (!session || isStarting || isCapturing || approvalAttemptRef.current) return;

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
            if (mountedRef.current) setCaptureError((current: unknown) => current ?? error);
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
          disabled={!isHydrated || isStarting || isCapturing || approvalAttempted}
          onClick={() => void startPayPalCheckout()}
        />
      ) : null}

      {showFallback && payment.approvalUrl && !approvalAttempted ? (
        <a
          href={payment.approvalUrl}
          onClick={() =>
            storePayPalRedirectContext({
              applicationId: String(payment.application.applicationId),
              orderId: payment.providerOrderId,
              paypalIntent: payment.paypalIntent,
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
          {getApiErrorMessage(
            captureError,
            approvalAttempted ? authorization("processing") : t("captureFailed"),
          )}
        </p>
      ) : null}
      {approvalAttempted && captureError ? (
        <Link href="/applications" className="min-h-11 text-sm text-primary underline">
          {authorization("viewApplications")}
        </Link>
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
  const paymentReady = isPayPalPaymentReady(payment);
  const authorization = useTranslations("PayPalAuthorization");
  let description: string | undefined;
  if (paymentReady) {
    const amount = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: payment.paymentCurrency,
    }).format(payment.paymentAmount);
    description =
      payment.paypalIntent === "AUTHORIZE"
        ? authorization("authorizationDescription", { amount })
        : t("description", { amount });
  }

  return (
    <ConfirmDialog
      title={t("title")}
      description={description}
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

  if (!isPayPalPaymentReady(payment)) {
    return (
      <p role="alert" className="rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">
        {t("unavailable")}
      </p>
    );
  }

  if (!clientId) {
    return payment.approvalUrl ? (
      <a
        href={payment.approvalUrl}
        onClick={() =>
          storePayPalRedirectContext({
            applicationId: String(payment.application.applicationId),
            orderId: payment.providerOrderId,
            paypalIntent: payment.paypalIntent,
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
