"use client";

import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/ui/icons";

export function PricingChoice({
  enabled,
  onChange,
}: Readonly<{ enabled: boolean; onChange: (enabled: boolean) => void }>) {
  const t = useTranslations("CreateActivity.discount.options");
  return (
    <div className="grid grid-cols-2 gap-3">
      {[false, true].map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={enabled === value}
          onClick={() => onChange(value)}
          className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors sm:px-5 ${enabled === value ? "border-primary text-primary-strong" : "border-line-soft text-muted hover:border-line-strong"}`}
        >
          {t(value ? "limited.title" : "none.title")}
          <span
            className={`flex size-5 shrink-0 items-center justify-center rounded-full ${enabled === value ? "bg-primary text-white" : "border border-line-strong"}`}
          >
            {enabled === value && <CheckIcon className="size-3" />}
          </span>
        </button>
      ))}
    </div>
  );
}
