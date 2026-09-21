"use client";
import { useTranslations } from "next-intl";

export function CancelledScheduleBadge() {
  const t = useTranslations("ScheduleCancellation");
  return (
    <span className="inline-flex w-fit shrink-0 rounded-full border border-primary/40 px-2 py-0.5 text-xs font-semibold text-primary">
      {t("cancelled")}
    </span>
  );
}
