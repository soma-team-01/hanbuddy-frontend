"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cancellationQuoteQueryOptions } from "@/lib/query/applications";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

function getRemainingSeconds(until: string) {
  const timestamp = Date.parse(until);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1_000));
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function FreeCancellationWindow({ applicationId }: Readonly<{ applicationId: string }>) {
  const t = useTranslations("Applications");
  const { data: quote, error, refetch } = useQuery(cancellationQuoteQueryOptions(applicationId));
  useAuthQueryRedirect(error);
  const freeCancellationUntil =
    quote?.policyType === "FREE_CANCELLATION_WINDOW" ? quote.freeCancellationUntil : null;

  if (!freeCancellationUntil) return null;

  return (
    <FreeCancellationCountdown
      key={freeCancellationUntil}
      until={freeCancellationUntil}
      label={(time) => t("freeCancellationRemaining", { time })}
      onExpire={() => void refetch()}
    />
  );
}

function FreeCancellationCountdown({
  until,
  label,
  onExpire,
}: Readonly<{
  until: string;
  label: (time: string) => string;
  onExpire: () => void;
}>) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingSeconds(until));

  useEffect(() => {
    let expired = false;
    const update = () => {
      const next = getRemainingSeconds(until);
      setRemainingSeconds(next);
      if (next === 0 && !expired) {
        expired = true;
        onExpire();
      }
    };
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [onExpire, until]);

  if (remainingSeconds <= 0) return null;

  return (
    <p
      className="font-display text-xs font-bold text-success"
      data-testid="free-cancellation-window"
    >
      {label(formatRemaining(remainingSeconds))}
    </p>
  );
}
