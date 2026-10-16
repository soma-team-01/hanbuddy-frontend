"use client";
import { CancellationReasonText } from "@/components/activity/CancellationReasonText";
import { ApprovalDeadline } from "@/components/booking/ApprovalDeadline";
import { ApprovalNotice } from "@/components/booking/ApprovalNotice";
import { PayPalAuthorizationNotice } from "@/components/payment/PayPalAuthorizationNotice";
import { isPayPalUncaptured, isPayPalResultPending } from "@/lib/payments/paypal-authorization";
import { isBuddyRejection, isClosedApplicationStatus } from "@/lib/application-approval";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  getWeatherForStartAt,
  getWeatherIconColor,
  WeatherConditionIcon,
} from "@/components/activity/AvailabilityCalendarDialog";
import { HostProfileDialog } from "@/components/activity/HostProfileDialog";
import { RefundPolicyAgreement, RefundPolicyNotice } from "@/components/booking/RefundPolicyNotice";
import {
  ApplicationScheduleRefundStatus,
  ScheduleRefundAmount,
  useApplicationScheduleRefundQuery,
} from "@/components/booking/ScheduleRefundStatus";
import type { ScheduleCancellationApplicant } from "@/types/schedule-cancellation";
import { ApplicationReviewActions } from "@/components/review/ApplicationReviewActions";
import { Avatar } from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import { getIntlLocale } from "@/i18n/routing";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { daysUntilSeoulDate, hasDateTimePassed } from "@/lib/datetime";
import { formatCurrency, formatKrw } from "@/lib/format";
import { isTossUserCancel } from "@/lib/payments/toss";
import {
  isPaymentProviderVisible,
  PAYMENT_PROVIDER_MODE,
  type PaymentProviderMode,
} from "@/lib/payment-provider-visibility";
import { activityWeatherQueryOptions } from "@/lib/query/activities";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import type { WeatherCondition } from "@/types/activity";
import type {
  Application,
  ApplicationCancellationReason,
  PaymentProvider,
} from "@/types/application";
import type { PolicyDocumentData } from "@/types/policy";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";
import { PaymentHoldCountdown } from "./payment-hold-countdown";
import { FreeCancellationWindow } from "./free-cancellation-window";
import { ReferralApplicationCancelButton } from "@/components/referral/ReferralApplicationCancelButton";

const TABS = ["upcoming", "past"] as const;

/**
 * 카드 실행 버튼 — 혼자 있든 둘이 있든 폭이 같아 보이도록 최소 폭을 고정한다.
 * 좁은 화면에서는 제목이 설 자리가 없어지므로 최소 폭 대신 가로를 꽉 채운다.
 */
const CARD_ACTION_CLASS =
  "h-12 w-full shrink-0 rounded-xl px-4 font-display text-sm font-bold whitespace-nowrap transition-colors disabled:opacity-40 md:w-auto md:min-w-32 max-md:static max-md:h-8 max-md:w-auto max-md:min-w-16 max-md:translate-y-0 max-md:rounded-lg max-md:px-3 max-md:text-[11px]";

const REASON_MESSAGE_KEY = {
  SCHEDULE_CONFLICT: "scheduleConflict",
  ILLNESS: "illness",
  FOUND_OTHER: "foundOther",
  OTHER: "other",
} as const satisfies Record<ApplicationCancellationReason, string>;

type TabKey = (typeof TABS)[number];

function PriceBreakdown({
  application,
  paymentCharge,
  scheduleRefund,
}: Readonly<{
  application: Application;
  paymentCharge: { amount: number; currency: string } | null;
  scheduleRefund?: ScheduleCancellationApplicant;
}>) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Applications");
  const breakdown = application.breakdown;
  const pricingT = useTranslations("QuantityPricing");
  const authorization = useTranslations("PayPalAuthorization");
  if (!breakdown) return null;

  const originalUnitPrice = breakdown.originalUnitPrice ?? breakdown.unitPrice;
  const originalTotalPrice = breakdown.originalTotalPrice ?? originalUnitPrice * breakdown.guests;
  const total =
    breakdown.finalTotalPrice ?? breakdown.unitPrice * breakdown.guests + breakdown.serviceFee;
  const discountAmount = breakdown.discountAmount ?? Math.max(0, originalTotalPrice - total);
  const hasDiscount = discountAmount > 0;
  const hasCompletedPayment =
    application.status === "pending_approval" ||
    application.status === "confirmed" ||
    application.status === "completed" ||
    isClosedApplicationStatus(application.status);
  const providerName =
    application.paymentProvider === "PAYPAL"
      ? "PayPal"
      : application.paymentProvider === "TOSS"
        ? "Toss Payments"
        : null;
  const paymentLabel = isPayPalUncaptured(application)
    ? authorization("uncollectedAmount")
    : providerName
      ? t("providerPaymentAmount", { provider: providerName })
      : t("paidAmount");
  const isForeignCurrency = paymentCharge?.currency.toUpperCase() !== "KRW";

  return (
    <div className="border-t border-line-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-sm text-muted transition-colors hover:text-ink max-md:min-h-9 max-md:gap-2 max-md:text-xs"
      >
        <span className="shrink-0">{t("priceBreakdown")}</span>
        {/* 접힌 상태에서는 요약 금액, 펼친 상태에서는 아래 상세 내역만 보여준다. */}
        <span className="flex items-center gap-1.5">
          {!open ? (
            <span className="flex flex-col items-end gap-0.5 font-display font-bold text-ink">
              <span className="max-md:text-sm">{formatKrw(total, locale)}</span>
              {paymentCharge && isForeignCurrency ? (
                <>
                  <span className="font-sans text-xs font-medium text-muted max-md:hidden">
                    {paymentLabel} ·{" "}
                    {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
                  </span>
                  <span className="font-sans text-xs font-medium text-muted md:hidden">
                    {providerName ?? paymentLabel} ·{" "}
                    {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
                  </span>
                </>
              ) : null}
            </span>
          ) : null}
          <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
          <div className="flex justify-between">
            <span>
              {t("subtotal", {
                price: formatKrw(originalUnitPrice, locale),
                count: breakdown.guests,
              })}
            </span>
            <span className={`tabular-nums ${hasDiscount ? "text-muted line-through" : ""}`}>
              {formatKrw(originalTotalPrice, locale)}
            </span>
          </div>
          {hasDiscount &&
          ((breakdown.quantityDiscountAmount ?? 0) > 0 ||
            (breakdown.periodDiscountAmount ?? 0) > 0) ? (
            <>
              {(breakdown.quantityDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between gap-3 font-semibold text-primary">
                  <span>{pricingT("quantityDiscount")}</span>
                  <span>-{formatKrw(breakdown.quantityDiscountAmount!, locale)}</span>
                </div>
              )}
              {(breakdown.periodDiscountAmount ?? 0) > 0 && (
                <div className="flex justify-between gap-3 font-semibold text-primary">
                  <span>{pricingT("periodDiscount")}</span>
                  <span>-{formatKrw(breakdown.periodDiscountAmount!, locale)}</span>
                </div>
              )}
            </>
          ) : hasDiscount ? (
            <div className="flex justify-between font-semibold text-primary">
              <span>
                {breakdown.discountPercent
                  ? t("discount", { percent: breakdown.discountPercent })
                  : t("discountAmount")}
              </span>
              <span className="tabular-nums">-{formatKrw(discountAmount, locale)}</span>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 font-display font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{formatKrw(total, locale)}</span>
          </div>
          {hasCompletedPayment && paymentCharge ? (
            <div className="flex justify-end gap-2 font-display font-semibold text-primary">
              <span>{paymentLabel}</span>
              <span className="tabular-nums">
                {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
              </span>
            </div>
          ) : null}
          {scheduleRefund ? <ScheduleRefundAmount task={scheduleRefund} /> : null}
          {isClosedApplicationStatus(application.status) &&
          application.cancellationReason !== "BUDDY_CANCELLATION" &&
          application.refund ? (
            <div className="mt-1 flex flex-col gap-2 border-t border-line-soft pt-2">
              <div className="flex justify-end gap-2 font-display font-semibold text-success">
                <span>
                  {application.refund.status === "COMPLETED"
                    ? t("refundedAmount")
                    : t(`refundStatuses.${application.refund.status}`)}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(
                    application.refund.refundAmount,
                    application.refund.refundCurrency,
                    locale,
                  )}
                </span>
              </div>
              <div className="flex justify-end gap-2 text-muted">
                <span>{t("cancellationFee")}</span>
                <span className="tabular-nums">
                  {formatCurrency(
                    application.refund.cancellationFeeAmount,
                    application.refund.refundCurrency,
                    locale,
                  )}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ApplicationWeatherIndicator({
  activityId,
  applicationId,
  startAt,
}: Readonly<{
  activityId: number;
  applicationId: string;
  startAt: string;
}>) {
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const weatherQuery = useQuery(activityWeatherQueryOptions(activityId));
  const forecast = getWeatherForStartAt(startAt, weatherQuery.data);

  if (!forecast) return null;

  const conditionLabels: Record<WeatherCondition, string> = {
    CLEAR: t("weatherConditions.clear"),
    PARTLY_CLOUDY: t("weatherConditions.partlyCloudy"),
    CLOUDY: t("weatherConditions.cloudy"),
    RAIN: t("weatherConditions.rain"),
    RAIN_SNOW: t("weatherConditions.rainSnow"),
    SNOW: t("weatherConditions.snow"),
    SHOWER: t("weatherConditions.shower"),
  };
  const conditionLabel = conditionLabels[forecast.condition];
  const temperature = new Intl.NumberFormat(getIntlLocale(locale), {
    maximumFractionDigits: 1,
  }).format(forecast.temperatureCelsius);
  const tooltipId = `application-weather-tooltip-${applicationId}`;

  return (
    <>
      <span aria-hidden="true" className="h-3.5 w-px bg-line-strong" />
      <span
        role="img"
        tabIndex={0}
        aria-label={conditionLabel}
        aria-describedby={tooltipId}
        className={`group/weather relative inline-flex size-7 shrink-0 items-center justify-center outline-none ${getWeatherIconColor(forecast.condition)}`}
      >
        <WeatherConditionIcon condition={forecast.condition} className="size-[22px]" />
        <span
          id={tooltipId}
          role="tooltip"
          className="invisible absolute right-0 bottom-full z-20 mb-2 w-max max-w-56 rounded-lg bg-ink px-3 py-2 text-left font-sans text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/weather:visible group-hover/weather:opacity-100 group-focus-visible/weather:visible group-focus-visible/weather:opacity-100"
        >
          <span className="block font-bold">
            {conditionLabel} · {t("weatherTemperature", { temperature })}
          </span>
          <span className="mt-1 block text-white/80">
            {forecast.precipitationProbability === null
              ? t("weatherPrecipitationUnavailable")
              : t("weatherPrecipitation", { percent: forecast.precipitationProbability })}
          </span>
          <span className="mt-3 block text-right text-[10px] text-white/55">
            {t("weatherAttribution")}
          </span>
        </span>
      </span>
    </>
  );
}

function ApplicationCard({
  application,
  onCancel,
  onCancelReferral,
  onCancelPending,
  onContinuePayment,
  onHoldExpired,
  isPaymentPending,
  paymentProviderMode,
  refundPolicyDocument,
}: Readonly<{
  application: Application;
  onCancel: () => void;
  onCancelReferral: () => Promise<CancelDialogOutcome>;
  onCancelPending: () => void;
  onContinuePayment: (applicationId: string, paymentProvider: PaymentProvider) => Promise<void>;
  onHoldExpired?: () => void;
  isPaymentPending: boolean;
  paymentProviderMode: PaymentProviderMode;
  refundPolicyDocument?: PolicyDocumentData;
}>) {
  const [paymentError, setPaymentError] = useState<unknown>(null);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const [pendingPaymentProvider, setPendingPaymentProvider] = useState<PaymentProvider | null>(
    null,
  );
  // 결제창이 열려 있는 동안에도 버튼을 잠가 중복 요청을 막는다
  const [paymentInFlight, setPaymentInFlight] = useState<PaymentProvider | null>(null);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [refundPolicyAgreed, setRefundPolicyAgreed] = useState(false);
  const t = useTranslations("Applications");
  const tActivityDetail = useTranslations("ActivityDetail");
  const tCancellation = useTranslations("ScheduleCancellation");
  const approval = useTranslations("Approval");
  const authorization = useTranslations("PayPalAuthorization");
  const paymentDeclined = application.cancellationReason === "PAYMENT_FAILED";
  const uncaptured = isPayPalUncaptured(application);
  const paymentResultPending = isPayPalResultPending(application);
  const isReferral = application.activityType === "REFERRAL";
  const isBuddyCancellation = application.cancellationReason === "BUDDY_CANCELLATION";
  const scheduleRefundQuery = useApplicationScheduleRefundQuery(
    application.id,
    isBuddyCancellation && !isReferral && !uncaptured,
  );
  const getApiErrorMessage = useApiErrorMessage();
  const paymentCharge =
    application.providerPaymentAmount !== null &&
    application.providerPaymentAmount !== undefined &&
    application.providerPaymentCurrency
      ? {
          amount: application.providerPaymentAmount,
          currency: application.providerPaymentCurrency,
        }
      : application.paymentAmount !== null &&
          application.paymentAmount !== undefined &&
          application.paymentCurrency
        ? { amount: application.paymentAmount, currency: application.paymentCurrency }
        : null;
  const isCompleted = application.status === "completed";
  const isCancelled = isClosedApplicationStatus(application.status);
  const isUpcoming =
    application.status === "pending_payment" ||
    application.status === "pending_approval" ||
    application.status === "confirmed";
  const isPaymentBusy =
    isPaymentPending || paymentInFlight !== null || pendingPaymentProvider !== null;
  const showTossPayment = isPaymentProviderVisible("TOSS", paymentProviderMode);
  const showPayPalPayment = isPaymentProviderVisible("PAYPAL", paymentProviderMode);
  const showProviderChoice = paymentProviderMode === "BOTH";
  const tossPaymentLabel = showProviderChoice ? t("continueWithToss") : t("payNow");
  const payPalPaymentLabel = showProviderChoice ? t("continueWithPayPal") : t("payNow");
  const tossPaymentText = showProviderChoice ? "Toss" : tossPaymentLabel;
  const payPalPaymentText = showProviderChoice ? "PayPal" : payPalPaymentLabel;
  // 종료된 활동은 백엔드가 취소를 거절하므로 버튼을 내린다 (조회 후 종료 시각이 지난 경우)
  const hasEnded = hasDateTimePassed(application.endAt);

  function showPaymentError(error: unknown) {
    if (error instanceof UnauthenticatedQueryError) return;
    setPaymentError(error);
  }

  function openPaymentReview(paymentProvider: PaymentProvider) {
    setApprovalAcknowledged(false);
    setRefundPolicyAgreed(false);
    setPaymentError(null);
    setPendingPaymentProvider(paymentProvider);
  }

  function closePaymentReview() {
    setPendingPaymentProvider(null);
    setPaymentError(null);
  }

  async function handleConfirmedPayment() {
    const paymentProvider = pendingPaymentProvider;
    if (
      isReferral ||
      !approvalAcknowledged ||
      !refundPolicyAgreed ||
      !paymentProvider ||
      paymentResultPending ||
      application.scheduleCancelled ||
      application.refundRecoveryPending
    )
      return;

    setPaymentError(null);
    setPaymentInFlight(paymentProvider);
    // 결제 SDK가 자체 모달을 띄우기 전에 사전 확인 팝업을 닫아 중첩 모달을 피한다.
    closePaymentReview();
    try {
      await onContinuePayment(application.id, paymentProvider);
    } catch (error) {
      if (paymentProvider === "TOSS" && isTossUserCancel(error)) {
        return;
      }
      showPaymentError(error);
    } finally {
      setPaymentInFlight(null);
    }
  }

  const dDay = isUpcoming ? daysUntilSeoulDate(application.startAt) : null;

  return (
    <article className="relative flex flex-col gap-4 rounded-3xl border border-line-soft bg-canvas-soft p-5 transition-colors hover:border-primary/50 max-md:gap-3 max-md:rounded-2xl max-md:p-3.5 md:p-6">
      <div className="flex gap-4 max-md:grid max-md:grid-cols-[80px_minmax(0,1fr)] max-md:gap-x-3 max-md:gap-y-1.5">
        <Link
          href={`/applications/${application.id}/activity`}
          aria-hidden="true"
          tabIndex={-1}
          className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-panel max-md:col-start-1 max-md:row-span-4 max-md:row-start-1 max-md:h-full max-md:min-h-20 max-md:w-20 max-md:rounded-xl md:size-28"
        >
          <Image
            src={getActivityThumbnail(application.thumbnailUrl)}
            alt=""
            fill
            sizes="112px"
            className={`object-cover ${isCancelled ? "opacity-60 saturate-[0.85]" : ""}`}
          />
        </Link>
        {/* 금액이 제목 줄의 높이를 늘리지 않도록 그리드로 배치한다 */}
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1.5 max-md:contents md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-wrap items-center gap-2 max-md:col-start-2 max-md:row-start-1 max-md:gap-1.5 md:col-start-1 max-md:[&>span]:px-2 max-md:[&>span]:py-0.5">
            <StatusBadge
              status={application.status}
              label={paymentDeclined ? authorization("declined") : undefined}
            />
            {dDay !== null && dDay >= 0 ? (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 font-display text-xs font-bold text-primary">
                {dDay === 0 ? t("dDayToday") : t("dDay", { count: dDay })}
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 max-md:contents md:col-start-1">
            <Link
              href={`/applications/${application.id}/activity`}
              className={
                isReferral
                  ? "min-w-0 after:absolute after:inset-0 after:rounded-3xl max-md:col-start-2 max-md:row-start-2"
                  : "min-w-0 max-md:col-start-2 max-md:row-start-2"
              }
            >
              <h3
                title={application.activityTitle}
                className={`line-clamp-2 font-display text-base leading-6 font-bold max-md:block max-md:truncate max-md:text-sm max-md:leading-5 ${
                  isCancelled ? "text-muted" : "text-ink"
                }`}
              >
                {application.activityTitle}
              </h3>
            </Link>
            <p className="flex items-center gap-2 text-sm text-muted max-md:col-start-2 max-md:row-start-4 max-md:gap-1 max-md:text-[11px] max-md:leading-4">
              <span>{application.dateLabel}</span>
              {application.status === "confirmed" && !hasEnded ? (
                <ApplicationWeatherIndicator
                  activityId={application.activityId}
                  applicationId={application.id}
                  startAt={application.startAt}
                />
              ) : null}
            </p>
            <button
              type="button"
              aria-label={tActivityDetail("viewHostProfile", { name: application.hostName })}
              onClick={() => setHostProfileOpen(true)}
              className="relative z-10 flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary max-md:col-start-2 max-md:row-start-3 max-md:max-w-full max-md:text-xs"
            >
              <Avatar name={application.hostName} src={application.hostAvatarUrl} size={20} />
              <span className="max-md:truncate">{application.hostName}</span>
            </button>
          </div>

          {/* 넓은 화면에서는 제목·일정·버디 묶음 옆에 실행 버튼과 취소 사유를 담는다 */}
          <div
            className={`relative z-10 order-last flex flex-col items-stretch gap-2 text-left max-md:col-span-2 max-md:col-start-1 max-md:row-span-1 max-md:row-start-5 max-md:mt-2 max-md:flex-row max-md:flex-wrap max-md:items-center max-md:justify-end max-md:gap-x-4 max-md:text-left max-md:empty:hidden md:order-none md:col-start-2 md:row-span-2 md:row-start-1 md:items-end md:text-right ${
              application.status === "confirmed" ? "md:self-stretch" : "md:self-center"
            } ${isBuddyCancellation ? "max-md:flex-nowrap max-md:items-start" : ""}`}
          >
            {!isReferral &&
            application.status === "pending_payment" &&
            !paymentResultPending &&
            !application.scheduleCancelled &&
            !application.refundRecoveryPending ? (
              // 세로로 쌓되 폭은 긴 쪽에 맞춰 나란히 떨어지게 한다
              <div className="flex w-full flex-col items-stretch gap-3 max-md:flex-row max-md:flex-wrap max-md:justify-end max-md:gap-2 md:w-auto">
                {showTossPayment ? (
                  <button
                    type="button"
                    disabled={isPaymentBusy}
                    onClick={() => openPaymentReview("TOSS")}
                    aria-label={tossPaymentLabel}
                    className={`${CARD_ACTION_CLASS} ${
                      showProviderChoice
                        ? "bg-[#3182f6] text-white enabled:hover:bg-[#1b64da]"
                        : "bg-primary text-on-primary enabled:hover:bg-primary-hover"
                    }`}
                  >
                    {tossPaymentText}
                  </button>
                ) : null}
                {showPayPalPayment ? (
                  <button
                    type="button"
                    disabled={isPaymentBusy}
                    onClick={() => openPaymentReview("PAYPAL")}
                    aria-label={payPalPaymentLabel}
                    className={`${CARD_ACTION_CLASS} ${
                      showProviderChoice
                        ? "bg-[#ffc439] text-[#111] enabled:hover:opacity-90"
                        : "bg-primary text-on-primary enabled:hover:bg-primary-hover"
                    }`}
                  >
                    {payPalPaymentText}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isPaymentBusy}
                  onClick={onCancelPending}
                  className={`${CARD_ACTION_CLASS} border border-line-strong text-muted enabled:hover:border-primary enabled:hover:text-primary`}
                >
                  {t("cancel")}
                </button>
              </div>
            ) : null}
            {(application.status === "confirmed" || application.status === "pending_approval") &&
            !application.scheduleCancelled &&
            !application.refundRecoveryPending &&
            !hasEnded ? (
              isReferral ? (
                <ReferralApplicationCancelButton
                  onCancel={onCancelReferral}
                  className={`${CARD_ACTION_CLASS} border border-line-strong text-muted enabled:hover:border-primary enabled:hover:text-primary md:absolute md:top-1/2 md:right-0 md:-translate-y-1/2`}
                />
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  className={`${CARD_ACTION_CLASS} border border-line-strong text-muted enabled:hover:border-primary enabled:hover:text-primary md:absolute md:top-1/2 md:right-0 md:-translate-y-1/2`}
                >
                  {t("cancel")}
                </button>
              )
            ) : null}
            {!isReferral &&
            application.status === "confirmed" &&
            !application.scheduleCancelled &&
            !application.refundRecoveryPending &&
            !hasEnded ? (
              <div className="max-md:order-first max-md:mr-auto max-md:min-w-0 max-md:flex-1 md:mt-auto max-md:[&>p]:text-[10px] max-md:[&>p]:leading-4">
                <FreeCancellationWindow
                  applicationId={application.id}
                  startAt={application.startAt}
                />
              </div>
            ) : null}
            {!isReferral && isCompleted && !application.myReview ? (
              <ApplicationReviewActions
                applicationId={application.id}
                activityTitle={application.activityTitle}
                review={null}
                variant="compact"
              />
            ) : null}
            {!isReferral && isBuddyCancellation && !uncaptured ? (
              <ApplicationScheduleRefundStatus
                query={scheduleRefundQuery}
                className="max-md:mt-0 max-md:mr-auto max-md:min-w-0 max-md:flex-1 max-md:text-left max-md:[&_[role=status]]:text-xs"
              />
            ) : null}
            {paymentDeclined && (
              <Link
                href={`/activities/${application.activityId}`}
                className={`${CARD_ACTION_CLASS} inline-flex items-center justify-center border border-primary text-primary`}
              >
                {authorization("bookAgain")}
              </Link>
            )}
            {isCancelled &&
            application.cancellationReason &&
            application.cancellationReason !== "PAYMENT_FAILED" ? (
              <p
                className={`mt-auto text-xs text-muted max-md:leading-5 ${
                  isBuddyCancellation
                    ? "max-md:mt-0 max-md:min-w-0 max-md:flex-1 max-md:text-right max-md:text-[11px] max-md:break-words"
                    : "max-md:w-full"
                }`}
              >
                {application.cancellationReason === "BUDDY_CANCELLATION"
                  ? tCancellation("buddyCancellationReason")
                  : isBuddyRejection(application.cancellationReason)
                    ? approval(`cancelled.${application.cancellationReason}`)
                    : t("cancelledReason", {
                        reason: t(
                          `cancellationReasons.${REASON_MESSAGE_KEY[application.cancellationReason]}`,
                        ),
                      })}
                {application.cancellationDetail ? (
                  <span className="mt-1 block break-words text-ink">
                    {application.cancellationReason === "OTHER" ||
                    application.cancellationReason === "BUDDY_OTHER" ||
                    isBuddyCancellation ? (
                      <CancellationReasonText
                        kind="application"
                        id={application.id}
                        originalText={application.cancellationDetail}
                      />
                    ) : (
                      application.cancellationDetail
                    )}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {application.status === "pending_approval" && (
        <ApprovalDeadline expiresAt={application.approvalExpiresAt} />
      )}
      {paymentDeclined && (
        <p className="text-sm leading-6 text-muted max-md:text-xs">
          {authorization("declinedDescription")}
        </p>
      )}
      <PayPalAuthorizationNotice application={application} />
      {!isReferral && (
        <PriceBreakdown
          application={application}
          paymentCharge={paymentCharge}
          scheduleRefund={isBuddyCancellation && !uncaptured ? scheduleRefundQuery.data : undefined}
        />
      )}
      {!isReferral &&
      application.refundRecoveryPending &&
      application.cancellationReason !== "BUDDY_CANCELLATION" ? (
        <p role="status" className="border-l-2 border-primary pl-3 text-sm text-muted">
          {tCancellation("refundRecoveryPending")}
        </p>
      ) : null}
      {!isReferral &&
        application.status === "pending_payment" &&
        !application.scheduleCancelled &&
        !application.refundRecoveryPending && (
          <div className="flex flex-col gap-2">
            {application.holdExpiresAt ? (
              <PaymentHoldCountdown
                holdExpiresAt={application.holdExpiresAt}
                onExpire={onHoldExpired}
              />
            ) : null}
            {paymentError !== null && pendingPaymentProvider === null && (
              <p
                role="alert"
                className="rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
              >
                {getApiErrorMessage(paymentError, t("paymentFailed"))}
              </p>
            )}
          </div>
        )}
      {!isReferral && isCompleted && application.myReview ? (
        <ApplicationReviewActions
          applicationId={application.id}
          activityTitle={application.activityTitle}
          review={application.myReview}
        />
      ) : null}
      {hostProfileOpen ? (
        <HostProfileDialog
          host={{
            name: application.hostName,
            bio: tActivityDetail("localHost"),
            avatarUrl: application.hostAvatarUrl,
          }}
          currentActivityId={String(application.activityId)}
          onClose={() => setHostProfileOpen(false)}
        />
      ) : null}
      {!isReferral &&
      pendingPaymentProvider &&
      !paymentResultPending &&
      !application.scheduleCancelled &&
      !application.refundRecoveryPending ? (
        <ConfirmDialog
          title={t("paymentReviewTitle")}
          description={t("paymentReviewDescription")}
          confirmLabel={
            pendingPaymentProvider === "TOSS" ? t("resumeWithToss") : t("resumeWithPayPal")
          }
          pendingLabel={t("paymentProcessing")}
          cancelVariant="outline"
          isPending={paymentInFlight !== null}
          confirmDisabled={!approvalAcknowledged || !refundPolicyAgreed}
          onConfirm={() => void handleConfirmedPayment()}
          onClose={closePaymentReview}
        >
          <div className="max-h-[45dvh] overflow-y-auto pr-1">
            <RefundPolicyNotice
              document={refundPolicyDocument}
              idPrefix={`application-${application.id}-refund-policy`}
            />
          </div>
          <div className="mt-3">
            <RefundPolicyAgreement
              agreed={refundPolicyAgreed}
              onAgreedChange={setRefundPolicyAgreed}
              describedBy={`application-${application.id}-refund-policy-notice application-${application.id}-refund-policy-summary`}
            />
            <ApprovalNotice
              agreed={approvalAcknowledged}
              onAgreedChange={setApprovalAcknowledged}
            />
          </div>
          {paymentError !== null ? (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
            >
              {getApiErrorMessage(paymentError, t("paymentFailed"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </article>
  );
}

export function ApplicationList({
  applications,
  onCancelApplication,
  onCancelPendingPayment,
  onContinuePayment,
  onHoldExpired,
  isPaymentPending,
  refundPolicyDocument,
  paymentProviderMode = PAYMENT_PROVIDER_MODE,
}: Readonly<{
  applications: Application[];
  onCancelApplication: (
    applicationId: string,
    reason: ApplicationCancellationReason,
    detail?: string,
  ) => Promise<CancelDialogOutcome>;
  onCancelPendingPayment: (applicationId: string) => Promise<CancelDialogOutcome>;
  onContinuePayment: (applicationId: string, paymentProvider: PaymentProvider) => Promise<void>;
  /** 좌석 선점이 만료되면 목록을 다시 불러오도록 알린다 */
  onHoldExpired?: () => void;
  isPaymentPending: boolean;
  refundPolicyDocument?: PolicyDocumentData;
  paymentProviderMode?: PaymentProviderMode;
}>) {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [pendingCancelTargetId, setPendingCancelTargetId] = useState<string | null>(null);
  const [pendingCancelError, setPendingCancelError] = useState<unknown>(null);
  const t = useTranslations("Applications");
  const getListApiErrorMessage = useApiErrorMessage();

  const visibleApplications = applications.filter((application) =>
    tab === "upcoming"
      ? !application.scheduleCancelled &&
        (application.status === "pending_payment" ||
          application.status === "pending_approval" ||
          application.status === "confirmed")
      : application.scheduleCancelled ||
        application.status === "completed" ||
        isClosedApplicationStatus(application.status),
  );
  const cancelTarget = cancelTargetId
    ? applications.find(
        (application) =>
          application.id === cancelTargetId &&
          !application.scheduleCancelled &&
          !application.refundRecoveryPending &&
          (application.status === "confirmed" || application.status === "pending_approval"),
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6 border-b border-line-soft" role="tablist">
        {TABS.map((key) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-3 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "border-primary text-primary-strong"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      <div
        data-testid="application-list"
        className="grid gap-5 max-md:gap-3 lg:grid-cols-2 xl:grid-cols-1"
      >
        {visibleApplications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onCancel={() => setCancelTargetId(application.id)}
            onCancelReferral={() => onCancelApplication(application.id, "OTHER")}
            onCancelPending={() => {
              setPendingCancelError(null);
              setPendingCancelTargetId(application.id);
            }}
            onContinuePayment={onContinuePayment}
            onHoldExpired={onHoldExpired}
            isPaymentPending={isPaymentPending}
            paymentProviderMode={paymentProviderMode}
            refundPolicyDocument={refundPolicyDocument}
          />
        ))}
        {visibleApplications.length === 0 && (
          <div className="flex flex-col items-center gap-5 py-14 lg:col-span-2">
            <p className="text-center text-muted">{t("empty")}</p>
            <Link
              href="/explore"
              className="flex h-11 items-center justify-center rounded-full border-2 border-primary px-6 font-display text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              {t("exploreCta")}
            </Link>
          </div>
        )}
      </div>
      {pendingCancelTargetId ? (
        <ConfirmDialog
          title={t("cancelPendingTitle")}
          confirmLabel={t("cancelPendingConfirm")}
          cancelLabel={t("keepPendingApplication")}
          cancelVariant="outline"
          pendingLabel={t("cancelling")}
          tone="danger"
          onConfirm={async () => {
            const outcome = await onCancelPendingPayment(pendingCancelTargetId);
            if (outcome.ok) {
              setPendingCancelTargetId(null);
              return;
            }
            setPendingCancelError(outcome.error);
          }}
          onClose={() => setPendingCancelTargetId(null)}
        >
          {pendingCancelError !== null ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {getListApiErrorMessage(pendingCancelError, t("cancelFailed"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
      {cancelTarget ? (
        <CancelDialog
          applicationId={cancelTarget.id}
          startAt={cancelTarget.startAt}
          uncaptured={isPayPalUncaptured(cancelTarget)}
          onClose={() => setCancelTargetId(null)}
          onConfirm={async (reason, detail) => {
            const outcome = await onCancelApplication(cancelTarget.id, reason, detail);
            if (outcome.ok) setCancelTargetId(null);
            return outcome;
          }}
        />
      ) : null}
    </div>
  );
}
