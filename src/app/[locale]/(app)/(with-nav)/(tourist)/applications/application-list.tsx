"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { PayPalPaymentButtons } from "@/components/payments/PayPalPaymentButton";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { formatCurrency, formatKrw } from "@/lib/format";
import { UnauthenticatedQueryError } from "@/lib/query/result";
import type { Application, ApplicationCancellationReason } from "@/types/application";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";

const TABS = ["upcoming", "past"] as const;

interface PaymentOrderDetails {
  orderId: string;
  paymentAmount: number;
  paymentCurrency: string;
}

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

  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm text-ink-soft transition-colors hover:text-ink"
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
          {paymentCharge ? (
            <div className="font-display font-semibold text-forest">
              {t("paidWithPayPal", {
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
  onContinuePayment,
  onCapturePayment,
  isPaymentPending,
}: Readonly<{
  application: Application;
  onCancel: () => void;
  onContinuePayment: (applicationId: string) => Promise<PaymentOrderDetails>;
  onCapturePayment: (applicationId: string, paypalOrderId: string) => Promise<void>;
  isPaymentPending: boolean;
}>) {
  const [hasPaymentError, setHasPaymentError] = useState(false);
  const locale = useLocale();
  const t = useTranslations("Applications");
  const [paymentCharge, setPaymentCharge] = useState<{
    amount: number;
    currency: string;
  } | null>(
    application.paymentAmount !== null &&
      application.paymentAmount !== undefined &&
      application.paymentCurrency
      ? { amount: application.paymentAmount, currency: application.paymentCurrency }
      : null,
  );
  const isCompleted = application.status === "completed";
  const isCancelled = application.status === "cancelled";
  const totalKrw = application.breakdown
    ? application.breakdown.unitPrice * application.breakdown.guests +
      application.breakdown.serviceFee
    : null;

  function showPaymentError(error: unknown) {
    if (error instanceof UnauthenticatedQueryError) return;
    setHasPaymentError(true);
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <StatusBadge status={application.status} />
        <span className="text-xs text-ink-soft">{application.dateLabel}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar
            name={application.hostName}
            src={application.hostAvatarUrl}
            size={48}
            className={isCompleted ? "opacity-70" : ""}
          />
          <div className="min-w-0">
            <p
              className={`font-display text-sm font-semibold ${isCompleted || isCancelled ? "text-ink-soft" : "text-ink"}`}
            >
              {application.hostName}
            </p>
            <p
              className={`truncate text-base ${isCompleted || isCancelled ? "text-ink-soft" : "text-ink"}`}
            >
              {application.activityTitle}
            </p>
          </div>
        </div>
        {totalKrw !== null ? (
          <div className="shrink-0 text-right">
            <p className="font-display text-sm font-semibold text-ink">
              {formatKrw(totalKrw, locale)}
            </p>
            {!isCancelled && paymentCharge ? (
              <p className="mt-0.5 text-xs text-forest">
                {t("paidWithPayPal", {
                  amount: formatCurrency(paymentCharge.amount, paymentCharge.currency, locale),
                })}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {application.status === "confirmed" && (
        <PriceBreakdown application={application} paymentCharge={paymentCharge} />
      )}
      {application.status === "pending_payment" && (
        <div className="flex flex-col gap-2">
          <p className="font-display text-sm font-semibold text-forest">{t("continuePayment")}</p>
          <PayPalPaymentButtons
            disabled={isPaymentPending}
            createOrder={async () => {
              setHasPaymentError(false);
              const payment = await onContinuePayment(application.id);
              setPaymentCharge({
                amount: payment.paymentAmount,
                currency: payment.paymentCurrency,
              });
              return { orderId: payment.orderId };
            }}
            onApprove={async ({ orderId }) => {
              try {
                await onCapturePayment(application.id, orderId);
              } catch (error) {
                showPaymentError(error);
              }
            }}
            onError={showPaymentError}
          />
          {hasPaymentError && (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
            >
              {t("paymentFailed")}
            </p>
          )}
        </div>
      )}
      {application.status === "confirmed" && (
        <button
          type="button"
          onClick={onCancel}
          className="h-11 w-full rounded-lg bg-forest font-display text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          {t("cancel")}
        </button>
      )}
      {isCompleted && (
        <button
          type="button"
          disabled
          className="h-11 w-full cursor-not-allowed rounded-lg border border-line bg-chip font-display text-sm font-semibold text-ink-soft opacity-60"
        >
          {t("leaveReviewComingSoon")}
        </button>
      )}
    </article>
  );
}

export function ApplicationList({
  applications,
  onCancelApplication,
  onContinuePayment,
  onCapturePayment,
  isPaymentPending,
}: Readonly<{
  applications: Application[];
  onCancelApplication: (
    applicationId: string,
    reason: ApplicationCancellationReason,
  ) => Promise<CancelDialogOutcome>;
  onContinuePayment: (applicationId: string) => Promise<PaymentOrderDetails>;
  onCapturePayment: (applicationId: string, paypalOrderId: string) => Promise<void>;
  isPaymentPending: boolean;
}>) {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const t = useTranslations("Applications");

  const visibleApplications = applications.filter((application) =>
    tab === "upcoming"
      ? application.status === "pending_payment" || application.status === "confirmed"
      : application.status === "completed" || application.status === "cancelled",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6 border-b border-line" role="tablist">
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
                  ? "border-forest text-forest"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-5">
        {visibleApplications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onCancel={() => setCancelTargetId(application.id)}
            onContinuePayment={onContinuePayment}
            onCapturePayment={onCapturePayment}
            isPaymentPending={isPaymentPending}
          />
        ))}
        {visibleApplications.length === 0 && (
          <p className="py-10 text-center text-ink-soft">{t("empty")}</p>
        )}
      </div>
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
