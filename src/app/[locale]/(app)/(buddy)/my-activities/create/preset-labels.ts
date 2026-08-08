import enMessages from "@/messages/en.json";
import koMessages from "@/messages/ko.json";

type PresetSection = "inclusions" | "restrictions";

const LOCALE_MESSAGES = [enMessages, koMessages] as const;

/**
 * 프리셋 옵션의 모든 로케일 표기를 반환한다.
 * draft에는 선택 당시 로케일의 문자열이 저장되므로, 로케일을 전환해도
 * 선택 상태와 사용자 정의 항목 판별이 유지되도록 양쪽 표기를 함께 비교한다.
 */
export function getPresetLabelVariants(section: PresetSection, key: string): string[] {
  return LOCALE_MESSAGES.map(
    (messages) => (messages.CreateActivity[section].options as Record<string, string>)[key],
  ).filter((label): label is string => Boolean(label));
}

/** 섹션 프리셋의 모든 로케일 표기 집합 — 사용자 정의 항목 판별용 */
export function getPresetLineSet(section: PresetSection, keys: readonly string[]): Set<string> {
  return new Set(keys.flatMap((key) => getPresetLabelVariants(section, key)));
}
