import type { Locale } from "./routing";

const EXTERNAL_LOCALES = {
  en: { paypal: "en_US", googleLanguage: "en", googleRegion: "KR" },
  ko: { paypal: "ko_KR", googleLanguage: "ko", googleRegion: "KR" },
} as const;

export function getExternalLocales(locale: Locale) {
  return EXTERNAL_LOCALES[locale];
}
