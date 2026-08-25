import type { UserType } from "@/lib/auth/types";
import type { ContentLanguage } from "@/types/content-language";

const HANGUL_PATTERN = /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u;
const LATIN_PATTERN = /[a-z]/iu;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/giu;

export function resolveChatSourceLanguage(
  content: string,
  siteLanguage: ContentLanguage,
  userType: UserType | undefined,
): ContentLanguage {
  if (userType !== "BUDDY") return siteLanguage;
  if (HANGUL_PATTERN.test(content)) return "KO";

  const contentWithoutUrls = content.replace(URL_PATTERN, " ");
  return LATIN_PATTERN.test(contentWithoutUrls) ? "EN" : "KO";
}
