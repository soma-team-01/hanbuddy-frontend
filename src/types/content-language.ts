export const CONTENT_LANGUAGES = ["KO", "EN", "JA", "ZH_HANS", "ZH_HANT"] as const;

/** API 요청에 사용할 수 있는 콘텐츠 언어. UNKNOWN은 요청값으로 보내지 않는다. */
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];

/** 백엔드가 실제로 반환한 콘텐츠 언어. 이전 활동은 UNKNOWN일 수 있다. */
export type ResolvedContentLanguage = ContentLanguage | "UNKNOWN";

export function isContentLanguage(value: string | null | undefined): value is ContentLanguage {
  return CONTENT_LANGUAGES.includes(value as ContentLanguage);
}
