"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { PayPalRecoveryResult } from "@/components/payment/PaymentResultPanel";
import { useRouter } from "@/i18n/navigation";
import {
  authorizePayPalApplicationPayment,
  capturePayPalApplicationPayment,
} from "@/lib/api/applications";
import { isPayPalCheckoutReceived } from "@/lib/payments/paypal-authorization";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import {
  clearPayPalRedirectContext,
  readPayPalRedirectContext,
  storePayPalRedirectContext,
} from "@/lib/payments/paypal-redirect-context";
import { activityKeys } from "@/lib/query/activities";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { unwrapApiResult } from "@/lib/query/result";

const subscribeToBrowserState = () => () => undefined;

export function PayPalReturnContent({ token }: Readonly<{ token: string }>) {
  const locale = useLocale();
  const language = getContentLanguage(locale);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("Payment");
  const authorization = useTranslations("PayPalAuthorization");
  const getApiErrorMessage = useApiErrorMessage();
  const applicationId = useSyncExternalStore(
    subscribeToBrowserState,
    () => readPayPalRedirectContext(token)?.applicationId ?? null,
    () => null,
  );
  const browserReady = useSyncExternalStore(
    subscribeToBrowserState,
    () => true,
    () => false,
  );
  const startedRef = useRef(false);
  const captureMutation = useMutation({
    mutationFn: async (resolvedApplicationId: string) => {
      const context = readPayPalRedirectContext(token);
      // Refreshing an uncertain return page only reads status, never replays the command.
      if (!context || context.checkoutSubmitted)
        throw new Error("Checkout result requires verification");
      storePayPalRedirectContext({ ...context, checkoutSubmitted: true });
      const submit =
        context.paypalIntent === "AUTHORIZE"
          ? authorizePayPalApplicationPayment
          : capturePayPalApplicationPayment;
      const application = unwrapApiResult(
        await submit(resolvedApplicationId, { orderId: token }, language),
        "application",
      );
      if (
        String(application.applicationId) !== resolvedApplicationId ||
        !isPayPalCheckoutReceived(application)
      ) {
        throw new Error("PayPal 결제 승인 결과가 확정 상태가 아닙니다.");
      }
      return application;
    },
    onSuccess: async (application) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
      clearPayPalRedirectContext();
      router.replace(`/payments/success?applicationId=${application.applicationId}`);
    },
  });

  const capture = captureMutation.mutate;
  useEffect(() => {
    if (!applicationId || !token || startedRef.current) return;
    startedRef.current = true;
    capture(applicationId);
  }, [applicationId, capture, token]);

  const applicationsQuery = useQuery({
    ...myApplicationsQueryOptions(language),
    enabled: captureMutation.isError && applicationId !== null,
    refetchInterval: false,
    retry: false,
  });

  useEffect(() => {
    if (!applicationId || !applicationsQuery.data) return;
    const confirmed = applicationsQuery.data.find(
      (application) =>
        String(application.applicationId) === applicationId &&
        isPayPalCheckoutReceived(application),
    );
    if (!confirmed) return;
    clearPayPalRedirectContext();
    router.replace(`/payments/success?applicationId=${applicationId}`);
  }, [applicationId, applicationsQuery.data, router]);

  if (!browserReady) {
    return (
      <p role="status" className="flex flex-1 items-center justify-center text-muted">
        {t("confirming")}
      </p>
    );
  }

  if (!token || applicationId === null) {
    return <PayPalRecoveryResult message={t("paypalReturnNotFound")} />;
  }

  if (captureMutation.error && applicationsQuery.isPending) {
    return (
      <p role="status" className="flex flex-1 items-center justify-center text-muted">
        {t("confirming")}
      </p>
    );
  }

  if (captureMutation.error) {
    const declined = applicationsQuery.data?.some(
      (application) =>
        String(application.applicationId) === applicationId &&
        application.cancellationReason === "PAYMENT_FAILED",
    );
    return (
      <PayPalRecoveryResult
        declined={declined}
        message={
          declined
            ? authorization("declinedDescription")
            : getApiErrorMessage(captureMutation.error, authorization("processing"))
        }
      />
    );
  }

  return (
    <p role="status" className="flex flex-1 items-center justify-center text-muted">
      {t("confirming")}
    </p>
  );
}
