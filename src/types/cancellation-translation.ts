import type { ContentLanguage, ResolvedContentLanguage } from "./content-language";

export type CancellationTranslationTarget = "application" | "schedule";
export interface CancellationTranslation {
  originalText: string | null;
  displayText: string | null;
  sourceLanguage: ResolvedContentLanguage;
  targetLanguage: ContentLanguage;
  status: "TRANSLATED" | "ORIGINAL" | "UNAVAILABLE" | "NOT_APPLICABLE";
}
