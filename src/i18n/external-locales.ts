import type { Locale } from "./routing";

const EXTERNAL_LOCALES = {
  en: { googleLanguage: "en", googleRegion: "KR" },
  ko: { googleLanguage: "ko", googleRegion: "KR" },
} as const;

export function getExternalLocales(locale: Locale) {
  return EXTERNAL_LOCALES[locale];
}
