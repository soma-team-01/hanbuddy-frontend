"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { ApplicationConfirmation } from "@/components/activity/ApplicationConfirmation";
import { PayPalRecoveryResult } from "@/components/payment/PaymentResultPanel";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import { confirmApplicationPayment } from "@/lib/api/applications";
import { isSubmittedApplicationStatus } from "@/lib/application-approval";
import { isPayPalCheckoutReceived } from "@/lib/payments/paypal-authorization";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { activityKeys } from "@/lib/query/activities";
import { applicationKeys, myApplicationsQueryOptions } from "@/lib/query/applications";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

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

export function PaymentSuccessContent({
  applicationId,
  paymentKey,
  orderId,
  amount,
}: Readonly<PaymentSuccessContentProps>) {
  const queryClient = useQueryClient();
  const language = getContentLanguage(useLocale());
  const t = useTranslations("Payment");
  const getApiErrorMessage = useApiErrorMessage();
  const authorization = useTranslations("PayPalAuthorization");
  const hasConfirmParams = paymentKey.length > 0 && orderId.length > 0 && amount !== null;
  const confirmMutation = useMutation({
    mutationFn: async () =>
      unwrapApiResult(
        await confirmApplicationPayment(
          applicationId,
          {
            paymentKey,
            orderId,
            amount: amount ?? 0,
          },
          language,
        ),
        "application",
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: applicationKeys.mine() }),
        // 선점이 좌석으로 확정됐으므로 활동 상세의 잔여 좌석을 갱신한다
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });
  const confirmStartedRef = useRef(false);
  const applicationsQuery = useQuery({
    ...myApplicationsQueryOptions(language),
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
    return <ApplicationConfirmation application={confirmMutation.data} />;
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
  if (!isSubmittedApplicationStatus(application.status)) {
    if (application.cancellationReason === "PAYMENT_FAILED")
      return <PayPalRecoveryResult declined message={authorization("declinedDescription")} />;
    if (application.paypalAuthorization)
      return <PayPalRecoveryResult message={authorization("processing")} />;
    return <RecoveryState message={t("notPaid")} />;
  }
  if (
    application.paypalAuthorization &&
    !isPayPalCheckoutReceived(application) &&
    !(
      application.status === "PENDING_APPROVAL" &&
      application.paypalAuthorization.state === "CAPTURE_REQUESTED"
    )
  )
    return <PayPalRecoveryResult message={authorization("processing")} />;

  return <ApplicationConfirmation application={application} />;
}
