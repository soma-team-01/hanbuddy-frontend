"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ClockIcon } from "@/components/ui/icons";

function formatRemaining(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * 결제 대기 신청이 좌석을 선점하는 남은 시간을 보여준다.
 * 만료되면 목록에서 사라져야 하므로 호출부에 한 번만 알린다.
 */
export function PaymentHoldCountdown({
  holdExpiresAt,
  onExpire,
}: Readonly<{ holdExpiresAt: string; onExpire?: () => void }>) {
  const t = useTranslations("Applications");
  const [now, setNow] = useState(() => Date.now());
  const notifiedHoldRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresAt = new Date(holdExpiresAt).getTime();
  const remainingMs = Number.isNaN(expiresAt) ? null : expiresAt - now;
  const expired = remainingMs !== null && remainingMs <= 0;

  useEffect(() => {
    if (!expired || notifiedHoldRef.current === holdExpiresAt) return;
    notifiedHoldRef.current = holdExpiresAt;
    onExpire?.();
  }, [expired, holdExpiresAt, onExpire]);

  if (remainingMs === null || expired) return null;

  const urgent = remainingMs <= 60_000;

  return (
    <p
      data-testid="payment-hold-countdown"
      className={`flex items-center gap-1.5 text-xs font-semibold ${
        urgent ? "text-danger" : "text-primary"
      }`}
    >
      <ClockIcon className="size-3.5" />
      {t("holdRemaining", { time: formatRemaining(remainingMs) })}
    </p>
  );
}
