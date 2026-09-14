import type { Locale } from "@/i18n/routing";
import type { DisplayCurrency } from "@/types/display-currency";

export function formatKrw(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDisplayCurrency(
  amount: number,
  currency: DisplayCurrency,
  locale: Locale,
): string {
  const hasMinorUnits = currency === "USD" || currency === "CNY";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: hasMinorUnits ? 2 : 0,
    maximumFractionDigits: hasMinorUnits ? 2 : 0,
  }).format(amount);
}
