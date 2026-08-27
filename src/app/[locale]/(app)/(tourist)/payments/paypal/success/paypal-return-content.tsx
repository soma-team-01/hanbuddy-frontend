"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link, useRouter } from "@/i18n/navigation";
import { capturePayPalApplicationPayment } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import {
  clearPayPalRedirectContext,
  readPayPalRedirectContext,
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
    mutationFn: async (resolvedApplicationId: string) =>
      unwrapApiResult(
        await capturePayPalApplicationPayment(resolvedApplicationId, { orderId: token }, language),
        "application",
      ),
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
  });

  useEffect(() => {
    if (!applicationId || !applicationsQuery.data) return;
    const confirmed = applicationsQuery.data.find(
      (application) =>
        String(application.applicationId) === applicationId && application.status === "CONFIRMED",
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
    return (
      <PageContainer className="flex flex-1 items-center justify-center py-16">
        <main className="w-full max-w-xl rounded-3xl border border-line-soft bg-canvas-soft p-8 text-center">
          <p role="alert" className="text-sm text-muted">
            {t("paypalReturnNotFound")}
          </p>
          <Link
            href="/applications"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 font-display text-sm font-bold text-on-primary"
          >
            {t("viewApplications")}
          </Link>
        </main>
      </PageContainer>
    );
  }

  if (captureMutation.error && applicationsQuery.isPending) {
    return (
      <p role="status" className="flex flex-1 items-center justify-center text-muted">
        {t("confirming")}
      </p>
    );
  }

  if (captureMutation.error) {
    return (
      <PageContainer className="flex flex-1 items-center justify-center py-16">
        <main className="w-full max-w-xl rounded-3xl border border-line-soft bg-canvas-soft p-8 text-center">
          <p role="alert" className="text-sm text-danger">
            {getApiErrorMessage(captureMutation.error, t("confirmFailed"))}
          </p>
          <Link
            href="/applications"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-primary px-6 font-display text-sm font-bold text-on-primary"
          >
            {t("viewApplications")}
          </Link>
        </main>
      </PageContainer>
    );
  }

  return (
    <p role="status" className="flex flex-1 items-center justify-center text-muted">
      {t("confirming")}
    </p>
  );
}
