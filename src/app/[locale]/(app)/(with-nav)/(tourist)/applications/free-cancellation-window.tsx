"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday, formatSeoulTime } from "@/lib/datetime";
import { cancellationQuoteQueryOptions } from "@/lib/query/applications";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function FreeCancellationWindow({ applicationId }: Readonly<{ applicationId: string }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Applications");
  const { data: quote, error, refetch } = useQuery(cancellationQuoteQueryOptions(applicationId));
  useAuthQueryRedirect(error);
  const freeCancellationUntil =
    quote?.policyType === "FREE_CANCELLATION_WINDOW" ? quote.freeCancellationUntil : null;
  const deadlineDate = freeCancellationUntil
    ? formatSeoulDateWithWeekday(freeCancellationUntil, locale)
    : null;
  const deadlineTime = freeCancellationUntil
    ? formatSeoulTime(freeCancellationUntil, locale)
    : null;
  const deadline = deadlineDate && deadlineTime ? `${deadlineDate} · ${deadlineTime}` : null;

  useEffect(() => {
    if (!freeCancellationUntil) return;
    const delay = Date.parse(freeCancellationUntil) - Date.now();
    if (!Number.isFinite(delay) || delay > 2_147_483_647) return;

    const timeout = window.setTimeout(() => void refetch(), Math.max(0, delay + 50));
    return () => window.clearTimeout(timeout);
  }, [freeCancellationUntil, refetch]);

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
