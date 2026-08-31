"use client";

import { useTranslations } from "next-intl";
import { useDisplayCurrency } from "@/lib/display-currency-context";
import { DISPLAY_CURRENCIES, type DisplayCurrency } from "@/types/display-currency";

export function CurrencySwitcher({ className = "" }: Readonly<{ className?: string }>) {
  const t = useTranslations("Navigation");
  const { displayCurrency, selectDisplayCurrency } = useDisplayCurrency();

  return (
    <label className={`inline-flex items-center gap-2 text-sm text-muted ${className}`}>
      <span className="sr-only">{t("displayCurrency")}</span>
      <select
        value={displayCurrency}
        aria-label={t("displayCurrency")}
        onChange={(event) => selectDisplayCurrency(event.target.value as DisplayCurrency)}
        className="min-h-10 cursor-pointer rounded-full border border-line-soft bg-canvas-soft px-3 font-semibold text-ink transition-colors outline-none hover:border-primary focus:border-primary"
      >
        {DISPLAY_CURRENCIES.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </label>
  );
}
