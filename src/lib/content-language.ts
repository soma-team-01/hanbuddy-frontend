import type { Locale } from "@/i18n/routing";
import type { ContentLanguage, ResolvedContentLanguage } from "@/types/content-language";

const CONTENT_LANGUAGE_BY_LOCALE: Record<Locale, ContentLanguage> = {
  en: "EN",
  ko: "KO",
  ja: "JA",
  "zh-Hans": "ZH_HANS",
  "zh-Hant": "ZH_HANT",
};

const LANGUAGE_TAG_BY_CONTENT_LANGUAGE: Record<ContentLanguage, Locale> = {
  KO: "ko",
  EN: "en",
  JA: "ja",
  ZH_HANS: "zh-Hans",
  ZH_HANT: "zh-Hant",
};

export function getContentLanguage(locale: Locale): ContentLanguage {
  return CONTENT_LANGUAGE_BY_LOCALE[locale];
}

export function getContentLanguageTag(language: ResolvedContentLanguage): Locale | undefined {
  if (language === "UNKNOWN") return undefined;
  return LANGUAGE_TAG_BY_CONTENT_LANGUAGE[language];
}

export function withContentLanguage(path: string, language: ContentLanguage): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}language=${encodeURIComponent(language)}`;
}
