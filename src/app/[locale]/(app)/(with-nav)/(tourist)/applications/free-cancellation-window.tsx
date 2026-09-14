"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday, formatSeoulTime } from "@/lib/datetime";
import { cancellationQuoteQueryOptions } from "@/lib/query/applications";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

const FULL_REFUND_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function getFullRefundUntil(startAt: string, freeCancellationUntil: string) {
  const startAtMs = Date.parse(startAt);
  const freeCancellationUntilMs = Date.parse(freeCancellationUntil);
  if (!Number.isFinite(startAtMs) || !Number.isFinite(freeCancellationUntilMs)) return null;

  const activityPolicyDeadline = startAtMs - FULL_REFUND_THRESHOLD_MS;
  const bookingProtectionDeadline = Math.min(freeCancellationUntilMs, startAtMs);
  return new Date(Math.max(activityPolicyDeadline, bookingProtectionDeadline)).toISOString();
}

export function FreeCancellationWindow({
  applicationId,
  startAt,
}: Readonly<{ applicationId: string; startAt: string }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Applications");
  const { data: quote, error, refetch } = useQuery(cancellationQuoteQueryOptions(applicationId));
  useAuthQueryRedirect(error);
  const fullRefundUntil =
    quote?.refundPercent === 100 ? getFullRefundUntil(startAt, quote.freeCancellationUntil) : null;
  const deadlineDate = fullRefundUntil ? formatSeoulDateWithWeekday(fullRefundUntil, locale) : null;
  const deadlineTime = fullRefundUntil ? formatSeoulTime(fullRefundUntil, locale) : null;
  const deadline = deadlineDate && deadlineTime ? `${deadlineDate} · ${deadlineTime}` : null;

  useEffect(() => {
    if (!fullRefundUntil) return;
    const delay = Date.parse(fullRefundUntil) - Date.now();
    if (!Number.isFinite(delay) || delay > 2_147_483_647) return;

    const timeout = window.setTimeout(() => void refetch(), Math.max(0, delay + 50));
    return () => window.clearTimeout(timeout);
  }, [fullRefundUntil, refetch]);

  if (!quote) return null;

  if (quote.refundPercent !== 100) {
    return (
      <p
        className="font-display text-xs font-bold text-danger"
        data-testid="free-cancellation-window"
      >
        {t("freeCancellationEnded")}
      </p>
    );
  }

  if (!deadline) return null;

  return (
    <p
      className="font-display text-xs font-bold text-success"
      data-testid="free-cancellation-window"
    >
      {t("freeCancellationUntil", { dateTime: deadline })}
    </p>
  );
}
