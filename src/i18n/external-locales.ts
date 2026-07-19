import type { Locale } from "./routing";

const EXTERNAL_LOCALES = {
  en: { paypal: "en-US", googleLanguage: "en", googleRegion: "KR" },
  ko: { paypal: "ko-KR", googleLanguage: "ko", googleRegion: "KR" },
} as const;

export function getExternalLocales(locale: Locale) {
  return EXTERNAL_LOCALES[locale];
}
