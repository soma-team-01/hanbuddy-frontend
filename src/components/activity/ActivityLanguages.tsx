"use client";

import { useTranslations } from "next-intl";
import { isActivityLanguage, type ActivityLanguage } from "@/types/activity-language";

export function ActivityLanguages({
  languages,
  compact = false,
}: Readonly<{ languages?: ActivityLanguage[]; compact?: boolean }>) {
  const t = useTranslations("ActivityLanguages");
  const supported = [...new Set(languages?.filter(isActivityLanguage))];
  if (!supported.length) return null;
  const labels = supported.map((code) => t(`names.${code}`)).join(" · ");
  return (
    <p
      className={compact ? "truncate text-xs leading-5 text-muted" : "text-sm leading-6 text-muted"}
      title={labels}
    >
      <span className={compact ? "sr-only" : "mr-2 font-semibold text-ink"}>{t("title")}</span>
      {labels}
    </p>
  );
}
