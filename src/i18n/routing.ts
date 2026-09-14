import { defineRouting } from "next-intl/routing";

export const LOCALES = ["en", "ko", "ja", "zh-Hans", "zh-Hant"] as const;
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "en",
  localePrefix: "always",
  localeCookie: {
    name: LOCALE_COOKIE_NAME,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  },
});

export function getLocaleOrDefault(value: string | null | undefined): Locale {
  return isLocale(value) ? value : routing.defaultLocale;
}

const INTL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
  ja: "ja-JP",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
};

export function getIntlLocale(locale: Locale): string {
  return INTL_LOCALE_BY_LOCALE[locale];
}
