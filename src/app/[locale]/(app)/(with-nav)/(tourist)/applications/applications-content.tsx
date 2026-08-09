"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  cancelMyApplication,
  cancelPendingPayment,
  continueApplicationPayment,
} from "@/lib/api/applications";
import { mapApplicationResponseToApplication } from "@/lib/api/application-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import type { Locale } from "@/i18n/routing";
import { requestTossPayment } from "@/lib/payments/toss";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { buddyKeys } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ApplicationCancellationReason, ApplicationResponse } from "@/types/application";
import { ApplicationList } from "./application-list";
import type { CancelDialogOutcome } from "./cancel-dialog";

export function ApplicationsContent() {
  const queryClient = useQueryClient();
  const locale = useLocale();
  const t = useTranslations("Applications");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
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
  const cancelPendingPaymentMutation = useMutation({
    mutationFn: async (applicationId: string) =>
      unwrapApiResult(await cancelPendingPayment(applicationId), "application"),
    onSuccess: async () => {
      // 결제 전 취소된 신청은 백엔드 목록에서 제외되므로 다시 불러온다
      await queryClient.invalidateQueries({ queryKey: applicationKeys.mine() });
      await queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
    },
  });
  const continuePaymentMutation = useMutation({
    mutationFn: async (applicationId: string) =>
      unwrapApiResult(await continueApplicationPayment(applicationId), "payment"),
  });
  useAuthQueryRedirect(
    applicationsQuery.error ??
      cancelApplicationMutation.error ??
      cancelPendingPaymentMutation.error ??
      continuePaymentMutation.error,
  );

  const applications = (applicationsQuery.data ?? [])
    // 새 신청으로 대체된 신청은 결제할 수도 취소할 수도 없으므로 목록에서 제외한다
    .filter((application) => application.status !== "SUPERSEDED")
    .map((application) =>
      mapApplicationResponseToApplication(application, tErrors("dateTimeUnavailable"), locale),
    );

  async function handleCancelApplication(
    applicationId: string,
    reason: ApplicationCancellationReason,
  ): Promise<CancelDialogOutcome> {
    try {
      await cancelApplicationMutation.mutateAsync({ applicationId, reason });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error,
      };
    }
  }

  async function handleCancelPendingPayment(applicationId: string): Promise<CancelDialogOutcome> {
    try {
      await cancelPendingPaymentMutation.mutateAsync(applicationId);
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  async function handleContinuePayment(applicationId: string) {
    const payment = await continuePaymentMutation.mutateAsync(applicationId);
    // 결제 인증이 끝나면 successUrl(/payments/success)로 리다이렉트되어 승인 API를 호출한다
    await requestTossPayment(payment, locale as Locale);
  }

  if (applicationsQuery.isPending) {
    return <p className="py-10 text-center text-muted">{t("loading")}</p>;
  }

  if (applicationsQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {getApiErrorMessage(applicationsQuery.error, t("loadError"))}
      </p>
    );
  }

  return (
    <ApplicationList
      applications={applications}
      onCancelApplication={handleCancelApplication}
      onCancelPendingPayment={handleCancelPendingPayment}
      onContinuePayment={handleContinuePayment}
      isPaymentPending={continuePaymentMutation.isPending}
    />
  );
}
