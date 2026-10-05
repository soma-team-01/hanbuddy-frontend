/** Actual spoken languages, intentionally distinct from ContentLanguage. */
export const ACTIVITY_LANGUAGES = [
  "KO",
  "EN",
  "JA",
  "ZH",
  "YUE",
  "ES",
  "FR",
  "DE",
  "VI",
  "TH",
  "ID",
] as const;
export type ActivityLanguage = (typeof ACTIVITY_LANGUAGES)[number];

export function isActivityLanguage(value: unknown): value is ActivityLanguage {
  return typeof value === "string" && ACTIVITY_LANGUAGES.some((language) => language === value);
}
