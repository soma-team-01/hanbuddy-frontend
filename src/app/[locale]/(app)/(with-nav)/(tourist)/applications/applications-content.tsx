"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PayPalPaymentProvider } from "@/components/payments/PayPalPaymentButton";
import { useRouter } from "@/i18n/navigation";
import {
  cancelMyApplication,
  captureApplicationPayment,
  continueApplicationPayment,
} from "@/lib/api/applications";
import { mapApplicationResponseToApplication } from "@/lib/api/application-view";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ApplicationCancellationReason, ApplicationResponse } from "@/types/application";
import { ApplicationList } from "./application-list";
import type { CancelDialogOutcome } from "./cancel-dialog";

export function ApplicationsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("Applications");
  const tErrors = useTranslations("Errors");
  const applicationsQuery = useQuery(myApplicationsQueryOptions());
  const cancelApplicationMutation = useMutation({
    mutationFn: async ({
      applicationId,
      reason,
    }: {
      applicationId: string;
      reason: ApplicationCancellationReason;
    }) => unwrapApiResult(await cancelMyApplication(applicationId, reason), "application"),
    onSuccess: async (application) => {
      queryClient.setQueryData<ApplicationResponse[]>(applicationKeys.mine(), (current = []) =>
        current.map((item) =>
          item.applicationId === application.applicationId ? application : item,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
    },
  });
  const continuePaymentMutation = useMutation({
    mutationFn: async (applicationId: string) =>
      unwrapApiResult(await continueApplicationPayment(applicationId), "payment"),
  });
  const capturePaymentMutation = useMutation({
    mutationFn: async ({
      applicationId,
      paypalOrderId,
    }: {
      applicationId: string;
      paypalOrderId: string;
    }) =>
      unwrapApiResult(await captureApplicationPayment(applicationId, paypalOrderId), "application"),
    onSuccess: async (application) => {
      queryClient.setQueryData<ApplicationResponse[]>(applicationKeys.mine(), (current = []) =>
        current.map((item) =>
          item.applicationId === application.applicationId
            ? {
                ...application,
                paymentAmount: application.paymentAmount ?? item.paymentAmount,
                paymentCurrency: application.paymentCurrency ?? item.paymentCurrency,
              }
            : item,
        ),
      );
      await queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
      router.replace(`/payments/success?applicationId=${application.applicationId}`);
    },
  });
  useAuthQueryRedirect(
    applicationsQuery.error ??
      cancelApplicationMutation.error ??
      continuePaymentMutation.error ??
      capturePaymentMutation.error,
  );

  const applications = (applicationsQuery.data ?? []).map((application) =>
    mapApplicationResponseToApplication(application, tErrors("dateTimeUnavailable"), locale),
  );

  async function handleCancelApplication(
    applicationId: string,
    reason: ApplicationCancellationReason,
  ): Promise<CancelDialogOutcome> {
    try {
      await cancelApplicationMutation.mutateAsync({ applicationId, reason });
      return { ok: true };
    } catch {
      return {
        ok: false,
        errorKey: "cancelFailed",
      };
    }
  }

  async function handleContinuePayment(applicationId: string) {
    const payment = await continuePaymentMutation.mutateAsync(applicationId);
    return {
      orderId: payment.paypalOrderId,
      paymentAmount: payment.paymentAmount,
      paymentCurrency: payment.paymentCurrency,
    };
  }

  async function handleCapturePayment(applicationId: string, paypalOrderId: string) {
    await capturePaymentMutation.mutateAsync({ applicationId, paypalOrderId });
  }

  if (applicationsQuery.isPending) {
    return <p className="py-10 text-center text-ink-soft">{t("loading")}</p>;
  }

  if (applicationsQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {t("loadError")}
      </p>
    );
  }

  return (
    <PayPalPaymentProvider>
      <ApplicationList
        applications={applications}
        onCancelApplication={handleCancelApplication}
        onContinuePayment={handleContinuePayment}
        onCapturePayment={handleCapturePayment}
        isPaymentPending={continuePaymentMutation.isPending || capturePaymentMutation.isPending}
      />
    </PayPalPaymentProvider>
  );
}
