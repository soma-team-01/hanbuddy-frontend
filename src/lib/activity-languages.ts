import {
  ACTIVITY_LANGUAGES,
  isActivityLanguage,
  type ActivityLanguage,
} from "@/types/activity-language";

export function isValidActivityLanguages(value: unknown): value is ActivityLanguage[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= ACTIVITY_LANGUAGES.length &&
    value.every(isActivityLanguage) &&
    new Set(value).size === value.length
  );
}

/** Empty legacy edit values must be omitted, never serialized as []. */
export function activityLanguagesForRequest(languages?: ActivityLanguage[]) {
  return languages?.length ? { availableLanguages: languages } : {};
}
