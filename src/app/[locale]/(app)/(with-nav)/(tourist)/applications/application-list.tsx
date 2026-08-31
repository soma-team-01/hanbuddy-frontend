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
import { activityWeatherQueryOptions } from "@/lib/query/activities";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import type { WeatherCondition } from "@/types/activity";
import type {
  Application,
  ApplicationCancellationReason,
  PaymentProvider,
} from "@/types/application";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";
import { PaymentHoldCountdown } from "./payment-hold-countdown";

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
    application.status === "confirmed" || application.status === "completed";

  return (
    <div className="border-t border-line-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 text-sm text-muted transition-colors hover:text-ink"
      >
        <span>{t("priceBreakdown")}</span>
        {/* 접혀 있어도 총액은 보이게 둔다 — 카드에서 금액을 따로 반복하지 않기 위해 */}
        <span className="flex items-center gap-1.5">
          <span className="font-display font-bold text-ink">
            {paymentCharge
              ? formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)
              : formatKrw(total, locale)}
          </span>
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
              <span>{t("paidAmount")}</span>
              <span className="tabular-nums">
                {formatCurrency(paymentCharge.amount, paymentCharge.currency, locale)}
              </span>
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
}: Readonly<{
  application: Application;
  onCancel: () => void;
  onCancelPending: () => void;
  onContinuePayment: (applicationId: string, paymentProvider: PaymentProvider) => Promise<void>;
  onHoldExpired?: () => void;
  isPaymentPending: boolean;
}>) {
  const [paymentError, setPaymentError] = useState<unknown>(null);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  // 결제창이 열려 있는 동안에도 버튼을 잠가 중복 요청을 막는다
  const [paymentInFlight, setPaymentInFlight] = useState<PaymentProvider | null>(null);
  const t = useTranslations("Applications");
  const tActivityDetail = useTranslations("ActivityDetail");
  const getApiErrorMessage = useApiErrorMessage();
  const paymentCharge =
    application.paymentAmount !== null &&
    application.paymentAmount !== undefined &&
    application.paymentCurrency
      ? { amount: application.paymentAmount, currency: application.paymentCurrency }
      : null;
  const isCompleted = application.status === "completed";
  const isCancelled = application.status === "cancelled";
  const isUpcoming = application.status === "pending_payment" || application.status === "confirmed";
  const isPaymentBusy = isPaymentPending || paymentInFlight !== null;
  // 종료된 활동은 백엔드가 취소를 거절하므로 버튼을 내린다 (조회 후 종료 시각이 지난 경우)
  const hasEnded = hasDateTimePassed(application.endAt);

  function showPaymentError(error: unknown) {
    if (error instanceof UnauthenticatedQueryError) return;
    setPaymentError(error);
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <StatusBadge status={application.status} />
            {dDay !== null && dDay >= 0 ? (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 font-display text-xs font-bold text-primary">
                {dDay === 0 ? t("dDayToday") : t("dDay", { count: dDay })}
              </span>
            ) : null}
          </div>

          <Link href={`/activities/${application.activityId}`} className="min-w-0 sm:col-start-1">
            <h3
              className={`line-clamp-2 font-display text-base leading-6 font-bold ${
                isCancelled ? "text-muted" : "text-ink"
              }`}
            >
              {application.activityTitle}
            </h3>
          </Link>
          {/* 넓은 화면에서는 제목과 일정·버디 정보 옆에 실행 버튼과 취소 사유를 담는다 */}
          <div className="order-last flex flex-col items-stretch gap-2 text-left sm:order-none sm:col-start-2 sm:row-span-2 sm:items-end sm:text-right">
            {application.status === "pending_payment" ? (
              // 세로로 쌓되 폭은 긴 쪽에 맞춰 나란히 떨어지게 한다
              <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto">
                <button
                  type="button"
                  disabled={isPaymentBusy}
                  onClick={async () => {
                    setPaymentError(null);
                    setPaymentInFlight("TOSS");
                    try {
                      // 토스 결제창을 연다 — 인증이 끝나면 /payments/success로 리다이렉트된다
                      await onContinuePayment(application.id, "TOSS");
                    } catch (error) {
                      if (!isTossUserCancel(error)) showPaymentError(error);
                    } finally {
                      setPaymentInFlight(null);
                    }
                  }}
                  aria-label={
                    paymentInFlight === "TOSS" ? t("paymentProcessing") : t("continueWithToss")
                  }
                  className={`${CARD_ACTION_CLASS} bg-[#3182f6] text-white enabled:hover:bg-[#1b64da]`}
                >
                  {paymentInFlight === "TOSS" ? t("paymentProcessing") : "Toss"}
                </button>
                <button
                  type="button"
                  disabled={isPaymentBusy}
                  onClick={async () => {
                    setPaymentError(null);
                    setPaymentInFlight("PAYPAL");
                    try {
                      await onContinuePayment(application.id, "PAYPAL");
                    } catch (error) {
                      showPaymentError(error);
                    } finally {
                      setPaymentInFlight(null);
                    }
                  }}
                  aria-label={
                    paymentInFlight === "PAYPAL" ? t("paymentProcessing") : t("continueWithPayPal")
                  }
                  className={`${CARD_ACTION_CLASS} bg-[#ffc439] text-[#111] enabled:hover:opacity-90`}
                >
                  {paymentInFlight === "PAYPAL" ? t("paymentProcessing") : "PayPal"}
                </button>
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

          <div className="flex min-w-0 flex-col gap-1.5 sm:col-start-1">
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
          {paymentError !== null && (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 px-4 py-3 text-sm text-danger"
            >
              {getApiErrorMessage(paymentError, t("paymentFailed"))}
            </p>
          )}
        </div>
      )}
      {isCompleted && (
        <ApplicationReviewActions
          applicationId={application.id}
          activityTitle={application.activityTitle}
          review={application.myReview}
        />
      )}
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
