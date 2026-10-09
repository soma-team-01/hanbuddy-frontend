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
  // 언어별 대체 주소는 각 페이지 메타데이터(<link hreflang>)에서 선언한다. 미들웨어가 붙이는 Link 헤더는
  // x-default를 리다이렉트되는 접두사 없는 주소로 잡고, 버디 화면처럼 리다이렉트되는 언어까지 선언한다.
  alternateLinks: false,
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
