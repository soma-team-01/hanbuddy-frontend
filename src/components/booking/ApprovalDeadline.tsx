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
export function ApprovalDeadline({
  expiresAt,
  inline = false,
  tone = "muted",
  compact = false,
}: Readonly<{
  expiresAt?: string | null;
  inline?: boolean;
  tone?: "muted" | "danger";
  compact?: boolean;
}>) {
  const t = useTranslations("Approval");
  const locale = useLocale();
  const expired = useApprovalExpired(expiresAt);
  const date = expiresAt ? formatSeoulDateTime(expiresAt, locale, { includeYear: !compact }) : null;
  if (!date) return null;
  const Tag = inline ? "span" : "p";
  return (
    <Tag
      className={`text-xs leading-5 ${inline ? "" : "mt-2"} ${tone === "danger" ? "text-danger" : "text-muted"}`}
    >
      {expired ? t("expired") : t(compact ? "deadlineCompact" : "deadline", { date })}
    </Tag>
  );
}
