"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { CheckCircleIcon, UserIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { confirmApplicationPayment } from "@/lib/api/applications";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { formatSeoulDateTime } from "@/lib/datetime";
import { formatCurrency, formatKrw } from "@/lib/format";
import { activityKeys } from "@/lib/query/activities";
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
  const tBooking = useTranslations("Booking");
  const tErrors = useTranslations("Errors");
  const scheduleLabel =
    formatSeoulDateTime(application.startAt, locale) ?? tErrors("dateTimeUnavailable");
  const paidAmount =
    application.paymentAmount !== null && application.paymentAmount !== undefined
      ? application.paymentAmount
      : application.totalPrice;
  // 실제 결제 통화로 표기한다 — 원화가 아닌 결제를 ₩로 적으면 금액을 잘못 읽는다
  const paidCurrency = application.paymentCurrency ?? application.currency;
  const originalTotalPrice = application.originalTotalPrice ?? application.totalPrice;
  const discountAmount =
    application.discountAmount ?? Math.max(0, originalTotalPrice - application.totalPrice);
  const hasDiscount = discountAmount > 0;

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-44 md:py-16 lg:pb-16">
      <main
        data-testid="payment-result"
        className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 shadow-[0_18px_45px_rgba(61,45,43,0.1)] md:p-10"
      >
        <section className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full border border-success/40 text-success">
            <CheckCircleIcon className="size-8" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink md:text-3xl">
            {t("complete")}
          </h1>
          <p className="mt-2 text-sm text-muted">{t("confirmed")}</p>
        </section>

        {/* 예약 화면의 요약 패널과 같은 구성 — 배경을 채우지 않고 구분선으로만 나눈다 */}
        <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-line-soft p-5">
          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-panel">
              <Image
                src={getActivityThumbnail(application.thumbnailImageUrl)}
                alt={application.activityTitle}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2 className="line-clamp-2 font-display text-base leading-6 font-bold text-ink">
                {application.activityTitle}
              </h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <UserIcon className="size-3.5" />
                {tBooking("hostedBy", { name: application.buddyName })}
              </p>
            </div>
          </div>

          <dl className="flex flex-col gap-3 border-t border-line-soft pt-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="shrink-0 text-muted">{tBooking("dateTime")}</dt>
              <dd className="text-right font-semibold text-ink">{scheduleLabel}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">{tBooking("guestCount")}</dt>
              <dd className="font-semibold text-ink">
                {tBooking("guests", { count: application.guestCount })}
              </dd>
            </div>
            {application.specialRequest ? (
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted">{tBooking("specialRequest")}</dt>
                <dd className="line-clamp-3 text-right text-xs leading-5 font-medium break-keep text-ink">
                  {application.specialRequest}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="flex items-center justify-between border-t border-line-soft pt-4 text-sm">
            <span className="text-muted">
              {hasDiscount ? t("originalAmountLabel") : t("totalLabel")}
            </span>
            <span className="font-semibold text-ink">{formatKrw(originalTotalPrice, locale)}</span>
          </div>

          {hasDiscount ? (
            <div className="flex items-center justify-between text-sm font-semibold text-primary">
              <span>
                {application.discountPercent
                  ? t("discountLabel", { percent: application.discountPercent })
                  : t("discountAmountLabel")}
              </span>
              <span>-{formatKrw(discountAmount, locale)}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between border-t border-line-soft pt-4">
            <span className="font-display text-base font-bold text-ink">{t("paidLabel")}</span>
            <span className="font-display text-xl font-bold text-primary">
              {formatCurrency(paidAmount, paidCurrency, locale)}
            </span>
          </div>
        </section>
        <div className="lg:mt-6">
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
        </div>
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
