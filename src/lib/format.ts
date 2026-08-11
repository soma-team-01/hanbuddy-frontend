import type { Locale } from "@/i18n/routing";

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
