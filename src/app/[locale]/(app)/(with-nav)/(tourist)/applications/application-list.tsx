"use client";

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
import { RefundPolicyNotice } from "@/components/booking/RefundPolicyNotice";
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

const TABS = ["upcoming", "past"] as const;

/**
 * 카드 실행 버튼 — 혼자 있든 둘이 있든 폭이 같아 보이도록 최소 폭을 고정한다.
 * 좁은 화면에서는 제목이 설 자리가 없어지므로 최소 폭 대신 가로를 꽉 채운다.
 */
const CARD_ACTION_CLASS =
  "h-9 w-full shrink-0 rounded-lg px-4 font-display text-xs font-bold whitespace-nowrap transition-colors disabled:opacity-40 sm:w-auto sm:min-w-32";

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
}: Readonly<{
  application: Application;
  paymentCharge: { amount: number; currency: string } | null;
}>) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Applications");
  const breakdown = application.breakdown;
  if (!breakdown) return null;

  const originalUnitPrice = breakdown.originalUnitPrice ?? breakdown.unitPrice;
  const originalTotalPrice = breakdown.originalTotalPrice ?? originalUnitPrice * breakdown.guests;
  const total =
    breakdown.finalTotalPrice ?? breakdown.unitPrice * breakdown.guests + breakdown.serviceFee;
  const discountAmount = breakdown.discountAmount ?? Math.max(0, originalTotalPrice - total);
  const hasDiscount = discountAmount > 0;
  const hasCompletedPayment =
    application.status === "confirmed" ||
    application.status === "completed" ||
    application.status === "cancelled";
  const providerName =
    application.paymentProvider === "PAYPAL"
      ? "PayPal"
      : application.paymentProvider === "TOSS"
        ? "Toss Payments"
        : null;
  const paymentLabel = providerName
    ? t("providerPaymentAmount", { provider: providerName })
    : t("paidAmount");
  const isForeignCurrency = paymentCharge?.currency.toUpperCase() !== "KRW";

  return (
    <div className="border-t border-line-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-sm text-muted transition-colors hover:text-ink"
      >
        <span>{t("priceBreakdown")}</span>
        {/* 접힌 상태에서는 요약 금액, 펼친 상태에서는 아래 상세 내역만 보여준다. */}
        <span className="flex items-center gap-1.5">
          {!open ? (
            <span className="flex flex-col items-end font-display font-bold text-ink">
              <span>{formatKrw(total, locale)}</span>
              {paymentCharge && isForeignCurrency ? (
                <span className="font-sans text-xs font-medium text-muted">
                  {paymentLabel} ·{" "}
                  {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
                </span>
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
          {hasDiscount ? (
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
          {application.status === "cancelled" && application.refund ? (
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
  onCancelPending,
  onContinuePayment,
  onHoldExpired,
  isPaymentPending,
  paymentProviderMode,
  refundPolicyDocument,
}: Readonly<{
  application: Application;
  onCancel: () => void;
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
  const t = useTranslations("Applications");
  const tActivityDetail = useTranslations("ActivityDetail");
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
  const isCancelled = application.status === "cancelled";
  const isUpcoming = application.status === "pending_payment" || application.status === "confirmed";
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
    setPaymentError(null);
    setPendingPaymentProvider(paymentProvider);
  }

  function closePaymentReview() {
    setPendingPaymentProvider(null);
    setPaymentError(null);
  }

  async function handleConfirmedPayment() {
    const paymentProvider = pendingPaymentProvider;
    if (!paymentProvider) return;

    setPaymentError(null);
    setPaymentInFlight(paymentProvider);
    try {
      await onContinuePayment(application.id, paymentProvider);
      closePaymentReview();
    } catch (error) {
      if (paymentProvider === "TOSS" && isTossUserCancel(error)) {
        closePaymentReview();
        return;
      }
      showPaymentError(error);
    } finally {
      setPaymentInFlight(null);
    }
  }

  const dDay = isUpcoming ? daysUntilSeoulDate(application.startAt) : null;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-line-soft bg-canvas-soft p-5 transition-colors hover:border-primary/50 md:p-6">
      <div className="flex gap-4">
        <Link
          href={`/activities/${application.activityId}`}
          aria-hidden="true"
          tabIndex={-1}
          className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-panel md:size-28"
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
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-wrap items-center gap-2 sm:col-start-1">
            <StatusBadge status={application.status} />
            {dDay !== null && dDay >= 0 ? (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 font-display text-xs font-bold text-primary">
                {dDay === 0 ? t("dDayToday") : t("dDay", { count: dDay })}
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-start-1">
            <Link href={`/activities/${application.activityId}`} className="min-w-0">
              <h3
                className={`line-clamp-2 font-display text-base leading-6 font-bold ${
                  isCancelled ? "text-muted" : "text-ink"
                }`}
              >
                {application.activityTitle}
              </h3>
            </Link>
            <p className="flex items-center gap-2 text-sm text-muted">
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
              className="flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
            >
              <Avatar name={application.hostName} src={application.hostAvatarUrl} size={20} />
              <span>{application.hostName}</span>
            </button>
          </div>

          {/* 넓은 화면에서는 제목·일정·버디 묶음 옆에 실행 버튼과 취소 사유를 담는다 */}
          <div className="order-last flex flex-col items-stretch gap-2 text-left sm:order-none sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:items-end sm:self-center sm:text-right">
            {application.status === "pending_payment" ? (
              // 세로로 쌓되 폭은 긴 쪽에 맞춰 나란히 떨어지게 한다
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto">
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
            {application.status === "confirmed" && !hasEnded ? (
              <button
                type="button"
                onClick={onCancel}
                className={`${CARD_ACTION_CLASS} border border-line-strong text-muted enabled:hover:border-primary enabled:hover:text-primary`}
              >
                {t("cancel")}
              </button>
            ) : null}
            {application.status === "confirmed" && !hasEnded ? (
              <FreeCancellationWindow applicationId={application.id} />
            ) : null}
            {isCompleted && !application.myReview ? (
              <ApplicationReviewActions
                applicationId={application.id}
                activityTitle={application.activityTitle}
                review={null}
                variant="compact"
              />
            ) : null}
            {isCancelled && application.cancellationReason ? (
              <p className="mt-auto text-xs text-muted">
                {t("cancelledReason", {
                  reason: t(
                    `cancellationReasons.${REASON_MESSAGE_KEY[application.cancellationReason]}`,
                  ),
                })}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <PriceBreakdown application={application} paymentCharge={paymentCharge} />
      {application.status === "pending_payment" && (
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
      {isCompleted && application.myReview ? (
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
      {pendingPaymentProvider ? (
        <ConfirmDialog
          title={t("paymentReviewTitle")}
          description={t("paymentReviewDescription")}
          confirmLabel={
            pendingPaymentProvider === "TOSS" ? t("resumeWithToss") : t("resumeWithPayPal")
          }
          pendingLabel={t("paymentProcessing")}
          isPending={paymentInFlight !== null}
          onConfirm={() => void handleConfirmedPayment()}
          onClose={closePaymentReview}
        >
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <RefundPolicyNotice
              document={refundPolicyDocument}
              idPrefix={`application-${application.id}-refund-policy`}
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
      ? application.status === "pending_payment" || application.status === "confirmed"
      : application.status === "completed" || application.status === "cancelled",
  );

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
      <div data-testid="application-list" className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
        {visibleApplications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onCancel={() => setCancelTargetId(application.id)}
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
      {cancelTargetId && (
        <CancelDialog
          applicationId={cancelTargetId}
          onClose={() => setCancelTargetId(null)}
          onConfirm={async (reason, detail) => {
            const outcome = await onCancelApplication(cancelTargetId, reason, detail);
            if (outcome.ok) setCancelTargetId(null);
            return outcome;
          }}
        />
      )}
    </div>
  );
}
