"use client";

import { useTranslations } from "next-intl";
import { GlobeIcon } from "@/components/ui/icons";
import { isActivityLanguage, type ActivityLanguage } from "@/types/activity-language";

export function ActivityLanguages({
  languages,
  compact = false,
  summary = false,
}: Readonly<{ languages?: ActivityLanguage[]; compact?: boolean; summary?: boolean }>) {
  const t = useTranslations("ActivityLanguages");
  const supported = [...new Set(languages?.filter(isActivityLanguage))];
  if (!supported.length) return null;
  const labels = supported.map((code) => t(`names.${code}`)).join(" · ");
  if (summary) {
    return (
      <div
        data-slot="activity-languages"
        className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 max-md:min-h-11 max-md:gap-3 max-md:rounded-none max-md:border-0 max-md:px-0 max-md:py-1.5"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-canvas-soft max-md:size-8 max-md:rounded-none max-md:border-0">
          <GlobeIcon className="size-5 text-primary max-md:size-[18px]" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-ink max-md:text-[13px]">
            {t("hostedIn")}
          </h3>
          <p className="text-xs leading-5 text-muted">{labels}</p>
        </div>
      </div>
    );
  }
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
