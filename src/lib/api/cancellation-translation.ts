import type { ContentLanguage } from "@/types/content-language";
import type {
  CancellationTranslation,
  CancellationTranslationTarget,
} from "@/types/cancellation-translation";
import { requestApiResult } from "./result";

export function getCancellationTranslation(
  kind: CancellationTranslationTarget,
  id: number | string,
  language: ContentLanguage,
  signal?: AbortSignal,
) {
  const resource = kind === "application" ? "applications" : "activity-schedules";
  const timeout = AbortSignal.timeout(20_000);
  return requestApiResult<CancellationTranslation, "translation">(
    `/api/${resource}/${encodeURIComponent(id)}/cancellation-translation?language=${language}`,
    "translation",
    { cache: "no-store", signal: signal ? AbortSignal.any([signal, timeout]) : timeout },
    "취소 사유 번역을 불러오지 못했습니다.",
  );
}
