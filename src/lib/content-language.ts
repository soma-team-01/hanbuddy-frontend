import type { Locale } from "@/i18n/routing";
import type { ContentLanguage } from "@/types/content-language";

const CONTENT_LANGUAGE_BY_LOCALE: Record<Locale, ContentLanguage> = {
  en: "EN",
  ko: "KO",
  ja: "JA",
  "zh-Hans": "ZH_HANS",
  "zh-Hant": "ZH_HANT",
};

export function getContentLanguage(locale: Locale): ContentLanguage {
  return CONTENT_LANGUAGE_BY_LOCALE[locale];
}

export function withContentLanguage(path: string, language: ContentLanguage): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}language=${encodeURIComponent(language)}`;
}
