"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { HostProfileDialog } from "@/components/activity/HostProfileDialog";
import { Avatar } from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { daysUntilSeoulDate, hasDateTimePassed } from "@/lib/datetime";
import { formatCurrency, formatKrw } from "@/lib/format";
import { isTossUserCancel } from "@/lib/payments/toss";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import type { Application, ApplicationCancellationReason } from "@/types/application";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";
import { PaymentHoldCountdown } from "./payment-hold-countdown";

const TABS = ["upcoming", "past"] as const;

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

  const subtotal = breakdown.unitPrice * breakdown.guests;
  const total = subtotal + breakdown.serviceFee;
  const hasCompletedPayment =
    application.status === "confirmed" || application.status === "completed";

  return (
    <div className="border-t border-line-soft pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm text-muted transition-colors hover:text-ink"
      >
        {t("priceBreakdown")}
        <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
          <div className="flex justify-between">
            <span>
              {t("subtotal", {
                price: formatKrw(breakdown.unitPrice, locale),
                count: breakdown.guests,
              })}
            </span>
            <span>{formatKrw(subtotal, locale)}</span>
          </div>
          {hasCompletedPayment && paymentCharge ? (
            <div className="font-display font-semibold text-primary-strong">
              {t("paidAmount", {
                amount: formatCurrency(paymentCharge.amount, paymentCharge.currency, locale),
              })}
            </div>
          ) : null}
          <div className="font-display font-semibold">
            {t("total", { amount: formatKrw(total, locale) })}
          </div>
        </div>
      )}
    </div>
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
  onContinuePayment: (applicationId: string) => Promise<void>;
  onHoldExpired?: () => void;
  isPaymentPending: boolean;
}>) {
  const [paymentError, setPaymentError] = useState<unknown>(null);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  // 결제창이 열려 있는 동안에도 버튼을 잠가 중복 요청을 막는다
  const [paymentInFlight, setPaymentInFlight] = useState(false);
  const locale = useLocale();
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
  const isPaymentBusy = isPaymentPending || paymentInFlight;
  // 종료된 활동은 백엔드가 취소를 거절하므로 버튼을 내린다 (조회 후 종료 시각이 지난 경우)
  const hasEnded = hasDateTimePassed(application.endAt);
  const hasCompletedPayment = application.status === "confirmed" || isCompleted;
  const totalKrw = application.breakdown
    ? application.breakdown.unitPrice * application.breakdown.guests +
      application.breakdown.serviceFee
    : null;

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
            className={`object-cover ${isCompleted || isCancelled ? "opacity-60 saturate-[0.85]" : ""}`}
          />
        </Link>
        {/* 금액이 제목 줄의 높이를 늘리지 않도록 그리드로 배치한다 */}
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5">
          <div className="col-span-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={application.status} />
            {dDay !== null && dDay >= 0 ? (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 font-display text-xs font-bold text-primary">
                {dDay === 0 ? t("dDayToday") : t("dDay", { count: dDay })}
              </span>
            ) : null}
          </div>

          <Link href={`/activities/${application.activityId}`} className="col-start-1 min-w-0">
            <h3
              className={`line-clamp-2 font-display text-base leading-6 font-bold ${
                isCompleted || isCancelled ? "text-muted" : "text-ink"
              }`}
            >
              {application.activityTitle}
            </h3>
          </Link>
          {/* 제목 줄에서 시작해 호스트 줄까지 걸쳐 금액과 취소 사유를 담는다 */}
          <div className="col-start-2 row-span-3 flex flex-col items-end text-right">
            {totalKrw !== null ? (
              <>
                <p className="font-display text-xl leading-6 font-bold text-ink">
                  {formatKrw(totalKrw, locale)}
                </p>
                {application.breakdown ? (
                  <p className="mt-1 text-xs text-muted">
                    {t("subtotal", {
                      price: formatKrw(application.breakdown.unitPrice, locale),
                      count: application.breakdown.guests,
                    })}
                  </p>
                ) : null}
                {hasCompletedPayment && paymentCharge ? (
                  <p className="mt-0.5 text-xs text-primary">
                    {t("paidAmount", {
                      amount: formatCurrency(paymentCharge.amount, paymentCharge.currency, locale),
                    })}
                  </p>
                ) : null}
              </>
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

          <p className="col-start-1 text-sm text-muted">{application.dateLabel}</p>
          <button
            type="button"
            aria-label={tActivityDetail("viewHostProfile", { name: application.hostName })}
            onClick={() => setHostProfileOpen(true)}
            className="col-start-1 flex w-fit items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary"
          >
            <Avatar name={application.hostName} src={application.hostAvatarUrl} size={20} />
            <span className="underline decoration-primary/40 decoration-2 underline-offset-4">
              {application.hostName}
            </span>
          </button>
        </div>
      </div>
      {application.status === "confirmed" && (
        <PriceBreakdown application={application} paymentCharge={paymentCharge} />
      )}
      {application.status === "pending_payment" && (
        <div className="flex flex-col gap-2">
          {application.holdExpiresAt ? (
            <PaymentHoldCountdown
              holdExpiresAt={application.holdExpiresAt}
              onExpire={onHoldExpired}
            />
          ) : null}
          <button
            type="button"
            disabled={isPaymentBusy}
            onClick={async () => {
              setPaymentError(null);
              setPaymentInFlight(true);
              try {
                // 토스 결제창을 연다 — 인증이 끝나면 /payments/success로 리다이렉트된다
                await onContinuePayment(application.id);
              } catch (error) {
                if (!isTossUserCancel(error)) showPaymentError(error);
              } finally {
                setPaymentInFlight(false);
              }
            }}
            className="h-11 w-full rounded-lg bg-primary font-display text-sm font-bold text-on-primary transition-colors enabled:hover:bg-primary-hover disabled:opacity-40"
          >
            {isPaymentBusy ? t("paymentProcessing") : t("continuePayment")}
          </button>
          <button
            type="button"
            disabled={isPaymentBusy}
            onClick={onCancelPending}
            className="h-11 w-full rounded-lg border border-line-strong font-display text-sm font-bold text-muted transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40"
          >
            {t("cancel")}
          </button>
          {paymentError !== null && (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {getApiErrorMessage(paymentError, t("paymentFailed"))}
            </p>
          )}
        </div>
      )}
      {application.status === "confirmed" && !hasEnded && (
        <button
          type="button"
          onClick={onCancel}
          className="h-11 w-full rounded-lg bg-primary font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
        >
          {t("cancel")}
        </button>
      )}
      {isCompleted && (
        <button
          type="button"
          disabled
          className="h-11 w-full cursor-not-allowed rounded-lg border border-line-soft bg-panel-raised font-display text-sm font-semibold text-muted opacity-60"
        >
          {t("leaveReviewComingSoon")}
        </button>
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
  ) => Promise<CancelDialogOutcome>;
  onCancelPendingPayment: (applicationId: string) => Promise<CancelDialogOutcome>;
  onContinuePayment: (applicationId: string) => Promise<void>;
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
          description={t("cancelPendingDescription")}
          confirmLabel={t("cancelPendingConfirm")}
          cancelLabel={t("keepPendingApplication")}
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
          onConfirm={async (reason) => {
            const outcome = await onCancelApplication(cancelTargetId, reason);
            if (outcome.ok) setCancelTargetId(null);
            return outcome;
          }}
        />
      )}
    </div>
  );
}
