"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { CheckCircleIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { confirmApplicationPayment } from "@/lib/api/applications";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatSeoulDateTime } from "@/lib/datetime";
import { formatKrw } from "@/lib/format";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ApplicationResponse } from "@/types/application";

interface PaymentSuccessContentProps {
  applicationId: string;
  /** 토스 successUrl 쿼리 파라미터 — 있으면 이 화면에서 결제 승인 API를 호출한다 */
  paymentKey: string;
  orderId: string;
  amount: number | null;
}

function RecoveryState({ message }: Readonly<{ message: string }>) {
  const t = useTranslations("Payment");

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-32 text-center md:py-16 lg:pb-16">
      <main className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 shadow-[0_18px_45px_rgba(61,45,43,0.1)] md:p-10">
        <p role="alert" className="text-base text-muted">
          {message}
        </p>
        <BottomActionBar>
          <Link
            href="/applications"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary"
          >
            {t("viewApplications")}
          </Link>
        </BottomActionBar>
      </main>
    </PageContainer>
  );
}

function ConfirmationResult({ application }: Readonly<{ application: ApplicationResponse }>) {
  const locale = useLocale();
  const t = useTranslations("Payment");
  const tErrors = useTranslations("Errors");
  const scheduleLabel =
    formatSeoulDateTime(application.startAt, locale) ?? tErrors("dateTimeUnavailable");
  const paidAmount =
    application.paymentAmount !== null && application.paymentAmount !== undefined
      ? application.paymentAmount
      : application.totalPrice;

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-44 md:py-16 lg:pb-16">
      <main
        data-testid="payment-result"
        className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 shadow-[0_18px_45px_rgba(61,45,43,0.1)] md:p-10"
      >
        <section className="flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircleIcon className="size-10" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">{t("complete")}</h1>
          <p className="mt-2 text-sm text-muted">{t("confirmed")}</p>
        </section>

        <section className="mt-10 rounded-2xl bg-panel-raised p-5">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t("experience")}
          </p>
          <h2 className="mt-2 font-display text-xl font-bold text-ink">
            {application.activityTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{scheduleLabel}</p>

          <div className="mt-5 divide-y divide-line-soft border-y border-line-soft">
            <div className="py-3 font-display text-base font-semibold text-ink">
              <p>
                {t("totalApplicationAmount", {
                  amount: formatKrw(application.totalPrice, locale),
                })}
              </p>
            </div>
            <div className="py-3 font-display text-lg font-semibold text-primary">
              <p>{t("paidAmount", { amount: formatKrw(paidAmount, locale) })}</p>
            </div>
          </div>
        </section>
        <BottomActionBar>
          <div className="flex w-full flex-col gap-2">
            <Link
              href="/applications"
              className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary"
            >
              {t("viewApplications")}
            </Link>
            <Link
              href="/explore"
              className="flex w-full items-center justify-center rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary"
            >
              {t("exploreMore")}
            </Link>
          </div>
        </BottomActionBar>
      </main>
    </PageContainer>
  );
}

export function PaymentSuccessContent({
  applicationId,
  paymentKey,
  orderId,
  amount,
}: Readonly<PaymentSuccessContentProps>) {
  const queryClient = useQueryClient();
  const t = useTranslations("Payment");
  const getApiErrorMessage = useApiErrorMessage();
  const hasConfirmParams = paymentKey.length > 0 && orderId.length > 0 && amount !== null;
  const confirmMutation = useMutation({
    mutationFn: async () =>
      unwrapApiResult(
        await confirmApplicationPayment(applicationId, {
          paymentKey,
          orderId,
          amount: amount ?? 0,
        }),
        "application",
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: applicationKeys.mine() });
    },
  });
  const confirmStartedRef = useRef(false);
  const applicationsQuery = useQuery({
    ...myApplicationsQueryOptions(),
    enabled: applicationId.length > 0 && !hasConfirmParams,
  });
  useAuthQueryRedirect(applicationsQuery.error ?? confirmMutation.error);

  const shouldConfirm = hasConfirmParams && applicationId.length > 0;
  const confirmMutate = confirmMutation.mutate;
  useEffect(() => {
    if (!shouldConfirm || confirmStartedRef.current) return;
    confirmStartedRef.current = true;
    confirmMutate();
  }, [shouldConfirm, confirmMutate]);

  if (!applicationId) {
    return <RecoveryState message={t("confirmationNotFound")} />;
  }

  // 토스 결제창에서 돌아온 경우: 승인 API 결과에 따라 화면을 결정한다
  if (hasConfirmParams) {
    if (confirmMutation.isError) {
      return (
        <RecoveryState message={getApiErrorMessage(confirmMutation.error, t("confirmFailed"))} />
      );
    }
    if (!confirmMutation.isSuccess) {
      return (
        <p role="status" className="flex flex-1 items-center justify-center text-muted">
          {t("confirming")}
        </p>
      );
    }
    return <ConfirmationResult application={confirmMutation.data} />;
  }

  // 승인 파라미터 없이 진입한 경우: 이미 승인된 신청의 확인 화면을 보여준다
  if (applicationsQuery.isPending) {
    return <p className="flex flex-1 items-center justify-center text-muted">{t("loading")}</p>;
  }

  if (applicationsQuery.error) {
    return <RecoveryState message={getApiErrorMessage(applicationsQuery.error, t("loadError"))} />;
  }

  const application = applicationsQuery.data.find(
    (item) => String(item.applicationId) === applicationId,
  );
  if (!application) {
    return <RecoveryState message={t("confirmationNotFound")} />;
  }
  if (application.status !== "CONFIRMED" && application.status !== "COMPLETED") {
    return <RecoveryState message={t("notPaid")} />;
  }

  return <ConfirmationResult application={application} />;
}
