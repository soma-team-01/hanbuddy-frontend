import type { Locale } from "@/i18n/routing";
import { DISPLAY_CURRENCIES, type DisplayCurrency } from "@/types/display-currency";

export const DISPLAY_CURRENCY_STORAGE_KEY = "hanbuddy-display-currency";

const DEFAULT_CURRENCY_BY_LOCALE: Record<Locale, DisplayCurrency> = {
  en: "USD",
  ko: "KRW",
  ja: "JPY",
  "zh-Hans": "CNY",
  "zh-Hant": "CNY",
};

export function isDisplayCurrency(value: string | null | undefined): value is DisplayCurrency {
  return DISPLAY_CURRENCIES.includes(value as DisplayCurrency);
}

export function getDefaultDisplayCurrency(locale: Locale): DisplayCurrency {
  return DEFAULT_CURRENCY_BY_LOCALE[locale];
}

export function withDisplayCurrency(path: string, currency: DisplayCurrency): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}displayCurrency=${currency}`;
}
