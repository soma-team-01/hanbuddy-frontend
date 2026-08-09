import type { Locale } from "@/i18n/routing";
import {
  formatSeoulDate,
  formatSeoulTime,
  getSeoulDateTimeParts,
  getSeoulNowParts,
} from "@/lib/datetime";

type ChatTranslator = (key: "today" | "yesterday") => string;

/** 오늘이면 시각, 어제면 "어제", 그 이전이면 날짜로 보여준다 */
export function formatChatTimestamp(
  value: string,
  locale: Locale,
  t: ChatTranslator,
  now = getSeoulNowParts(),
): string {
  const parts = getSeoulDateTimeParts(value);
  if (!parts) return "";
  if (parts.date === now.date) return formatSeoulTime(value, locale) ?? "";
  if (parts.date === previousSeoulDate(now.date)) return t("yesterday");

  return formatSeoulDate(value, locale) ?? "";
}

/** 메시지 사이에 끼우는 날짜 구분선 문구 */
export function formatChatDateSeparator(
  value: string,
  locale: Locale,
  t: ChatTranslator,
  now = getSeoulNowParts(),
): string {
  const parts = getSeoulDateTimeParts(value);
  if (!parts) return "";
  if (parts.date === now.date) return t("today");
  if (parts.date === previousSeoulDate(now.date)) return t("yesterday");

  return formatSeoulDate(value, locale) ?? "";
}

/** 같은 날짜인지 비교해 구분선을 넣을 위치를 정한다 */
export function isSameSeoulDate(left: string, right: string): boolean {
  const leftParts = getSeoulDateTimeParts(left);
  const rightParts = getSeoulDateTimeParts(right);

  return Boolean(leftParts && rightParts && leftParts.date === rightParts.date);
}

function previousSeoulDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const previous = new Date(Date.UTC(year, month - 1, day - 1));

  return previous.toISOString().slice(0, 10);
}
