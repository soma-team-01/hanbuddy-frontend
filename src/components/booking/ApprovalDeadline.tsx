"use client";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatSeoulDateTime } from "@/lib/datetime";
export function useApprovalExpired(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return !!expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= now;
}
export function ApprovalDeadline({ expiresAt }: Readonly<{ expiresAt?: string | null }>) {
  const t = useTranslations("Approval");
  const locale = useLocale();
  const expired = useApprovalExpired(expiresAt);
  const date = expiresAt ? formatSeoulDateTime(expiresAt, locale) : null;
  if (!date) return null;
  return (
    <p className="mt-2 text-xs leading-5 text-muted">
      {expired ? t("expired") : t("deadline", { date })}
    </p>
  );
}
