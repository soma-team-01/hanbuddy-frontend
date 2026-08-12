import type { Locale } from "@/i18n/routing";

/**
 * 대시보드 주간 스트립·월 캘린더용 날짜 계산.
 * "YYYY-MM-DD" 키만 다루는 순수 계산이라 시간대 문제가 없다.
 * (키 자체는 호출부가 Asia/Seoul 기준으로 만들어 넘긴다)
 */

const DAY_MS = 86_400_000;

function toUtc(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toDateKey(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  return toDateKey(toUtc(dateKey) + days * DAY_MS);
}

/** 0=일요일 … 6=토요일 */
export function weekdayIndexOf(dateKey: string): number {
  return new Date(toUtc(dateKey)).getUTCDay();
}

/** 그 날짜가 속한 주의 일요일 */
export function startOfWeek(dateKey: string): string {
  return addDaysToDateKey(dateKey, -weekdayIndexOf(dateKey));
}

/** 일요일부터 7일 */
export function weekDateKeys(anchorDateKey: string): string[] {
  const sunday = startOfWeek(anchorDateKey);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateKey(sunday, index));
}

/** "YYYY-MM" */
export function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function addMonthsToMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

/**
 * 월 캘린더 칸. 첫 주의 빈 앞자리는 null로 채워 일요일 시작 7열 격자에 바로 얹는다.
 * 뒤쪽은 채우지 않는다 — 마지막 줄이 짧아도 격자가 알아서 비운다.
 */
export function monthGridDateKeys(monthKey: string): (string | null)[] {
  const firstDay = `${monthKey}-01`;
  const [year, month] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return [
    ...Array.from({ length: weekdayIndexOf(firstDay) }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => addDaysToDateKey(firstDay, index)),
  ];
}

function localeTag(locale: Locale) {
  return locale === "ko" ? "ko-KR" : "en-US";
}

/** 키는 순수 달력 날짜라 UTC로 포맷해야 시간대에 밀리지 않는다 */
function dateOf(dateKey: string): Date {
  return new Date(toUtc(dateKey));
}

/** "일" / "Sun" */
export function formatDateKeyWeekday(dateKey: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "short",
    timeZone: "UTC",
  }).format(dateOf(dateKey));
}

/** "2026년 8월" / "August 2026" */
export function formatMonthKeyTitle(monthKey: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dateOf(`${monthKey}-01`));
}

/** "8월 12일 (수)" / "Wed, Aug 12" */
export function formatDateKeyLong(dateKey: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(dateOf(dateKey));
}

/** 캘린더 칸에 쓰는 일(day) 숫자 */
export function dayNumberOf(dateKey: string): number {
  return Number(dateKey.slice(-2));
}
