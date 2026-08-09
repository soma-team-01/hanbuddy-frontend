import type { Locale } from "@/i18n/routing";

export const SERVICE_TIME_ZONE = "Asia/Seoul";

const SEOUL_OFFSET = "+09:00";
const OFFSETFUL_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:\d{2})$/;
const DATETIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

const seoulPartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SERVICE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface SeoulDateTimeParts {
  date: string;
  time: string;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 0;
}

function isValidCalendarDateTime(match: RegExpMatchArray) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? 0);

  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  );
}

function getOffsetfulDate(value: string) {
  const match = OFFSETFUL_ISO_PATTERN.exec(value);
  if (!match || !isValidCalendarDateTime(match)) return null;

  const offset = match[8];
  if (offset !== "Z") {
    const offsetHour = Number(offset?.slice(1, 3));
    const offsetMinute = Number(offset?.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getSeoulDateTimeParts(value: string): SeoulDateTimeParts | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  const values = Object.fromEntries(
    seoulPartsFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: partValue }) => [type, partValue]),
  );
  const { year, month, day, hour, minute } = values;
  if (!year || !month || !day || !hour || !minute) return null;

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

/** 현재 시각을 Asia/Seoul 기준 날짜/시간 문자열로 반환한다 */
export function getSeoulNowParts(): SeoulDateTimeParts {
  const parts = getSeoulDateTimeParts(new Date().toISOString());
  if (!parts) {
    throw new Error("현재 시각을 Asia/Seoul 기준으로 변환하지 못했습니다.");
  }
  return parts;
}

export function toSeoulStartAt(localDateTime: string): string | null {
  const match = DATETIME_LOCAL_PATTERN.exec(localDateTime);
  if (!match || !isValidCalendarDateTime(match)) return null;

  const startAt = `${localDateTime}:00${SEOUL_OFFSET}`;
  const parts = getSeoulDateTimeParts(startAt);
  if (!parts || `${parts.date}T${parts.time}` !== localDateTime) return null;

  return startAt;
}

export function formatSeoulDateTime(value: string, locale: Locale): string | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  const formatted = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: SERVICE_TIME_ZONE,
    year: "numeric",
    month: locale === "ko" ? "numeric" : "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return locale === "ko"
    ? formatted.replace(/\bAM\b/g, "오전").replace(/\bPM\b/g, "오후")
    : formatted;
}

export function formatSeoulDate(value: string, locale: Locale): string | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: SERVICE_TIME_ZONE,
    year: "numeric",
    month: locale === "ko" ? "numeric" : "short",
    day: "numeric",
  }).format(date);
}

export function formatSeoulTime(value: string, locale: Locale): string | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  const formatted = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: SERVICE_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return locale === "ko"
    ? formatted.replace(/\bAM\b/g, "오전").replace(/\bPM\b/g, "오후")
    : formatted;
}

/** Asia/Seoul 기준 오늘부터 해당 일시의 날짜까지 남은 일수 (지난 날짜는 음수) */
export function daysUntilSeoulDate(value: string, now = getSeoulNowParts()): number | null {
  const parts = getSeoulDateTimeParts(value);
  if (!parts) return null;

  const toUtc = (dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toUtc(parts.date) - toUtc(now.date)) / 86_400_000);
}

/** 요일을 포함한 짧은 날짜 표기 (예: "Fri, Aug 22" / "8월 22일 (금)") */
export function formatSeoulDateWithWeekday(value: string, locale: Locale): string | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: SERVICE_TIME_ZONE,
    month: locale === "ko" ? "numeric" : "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatSeoulWeekday(value: string, locale: Locale): string | null {
  const date = getOffsetfulDate(value);
  if (!date) return null;

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    timeZone: SERVICE_TIME_ZONE,
    weekday: "short",
  }).format(date);
}
