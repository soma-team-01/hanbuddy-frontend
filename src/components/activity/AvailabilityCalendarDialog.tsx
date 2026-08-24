"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CloudIcon,
  CloudRainIcon,
  CloudRainSnowIcon,
  CloudShowerIcon,
  CloudSnowIcon,
  PartlyCloudyIcon,
  SunIcon,
  XIcon,
} from "@/components/ui/icons";
import { formatSeoulTime, getSeoulNowParts } from "@/lib/datetime";
import type { Locale } from "@/i18n/routing";
import type {
  ActivityWeatherForecast,
  ActivityWeatherResult,
  Session,
  WeatherCondition,
} from "@/types/activity";

/** 시작 시각 + 소요시간으로 "10:00 AM ~ 12:15 PM" 형태의 시간 범위를 만든다 */
export function formatSessionTimeRange(
  session: Session,
  durationMinutes: number | undefined,
  locale: Locale,
): string {
  if (!durationMinutes || !session.startAt) return session.timeLabel;

  const start = new Date(session.startAt);
  if (Number.isNaN(start.getTime())) return session.timeLabel;

  const endLabel = formatSeoulTime(
    new Date(start.getTime() + durationMinutes * 60_000).toISOString(),
    locale,
  );
  return endLabel ? `${session.timeLabel} ~ ${endLabel}` : session.timeLabel;
}

const WEEK_LENGTH = 7;

export function getSessionWeather(
  session: Session,
  weather: ActivityWeatherResult | undefined,
): ActivityWeatherForecast | null {
  if (!weather?.available || !session.startAt) return null;

  const scheduleMillis = new Date(session.startAt).getTime();
  if (Number.isNaN(scheduleMillis)) return null;

  const scheduleDate = session.startAt.slice(0, 10);
  let selected: ActivityWeatherForecast | null = null;
  let selectedMillis = 0;
  let selectedDistance = Number.POSITIVE_INFINITY;

  for (const candidate of weather.forecasts) {
    if (candidate.forecastAt.slice(0, 10) !== scheduleDate) continue;

    const candidateMillis = new Date(candidate.forecastAt).getTime();
    if (Number.isNaN(candidateMillis)) continue;

    const candidateDistance = Math.abs(candidateMillis - scheduleMillis);
    if (
      candidateDistance < selectedDistance ||
      (candidateDistance === selectedDistance && candidateMillis < selectedMillis)
    ) {
      selected = candidate;
      selectedMillis = candidateMillis;
      selectedDistance = candidateDistance;
    }
  }

  return selected;
}

function WeatherConditionIcon({
  condition,
  className,
}: Readonly<{ condition: WeatherCondition; className?: string }>) {
  switch (condition) {
    case "CLEAR":
      return <SunIcon className={className} />;
    case "PARTLY_CLOUDY":
      return <PartlyCloudyIcon className={className} />;
    case "CLOUDY":
      return <CloudIcon className={className} />;
    case "RAIN":
      return <CloudRainIcon className={className} />;
    case "RAIN_SNOW":
      return <CloudRainSnowIcon className={className} />;
    case "SNOW":
      return <CloudSnowIcon className={className} />;
    case "SHOWER":
      return <CloudShowerIcon className={className} />;
  }
}

export function getWeatherIconColor(condition: WeatherCondition) {
  switch (condition) {
    case "CLEAR":
      return "text-amber-500";
    case "PARTLY_CLOUDY":
      return "text-sky-500";
    case "CLOUDY":
      return "text-zinc-500";
    case "RAIN":
      return "text-blue-600";
    case "RAIN_SNOW":
      return "text-cyan-600";
    case "SNOW":
      return "text-sky-400";
    case "SHOWER":
      return "text-indigo-600";
  }
}

function toMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function shiftMonthKey(monthKey: string, offset: number) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthCells(monthKey: string) {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => `${monthKey}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
}

export function AvailabilityCalendarDialog({
  sessions,
  selectedSessionId,
  durationMinutes,
  weather,
  onSelectSession,
  onClose,
}: Readonly<{
  sessions: Session[];
  /** 하단 바에서 현재 선택된 세션 id */
  selectedSessionId: string | null;
  /** 총 소요시간(분) — 시간대의 종료 시간 표시에 사용 */
  durationMinutes?: number;
  /** 활동 장소의 기상청 시간별 예보. 없거나 사용 불가이면 일정만 표시한다 */
  weather?: ActivityWeatherResult;
  /** 시간대 선택 시 호출 — 호출부가 하단 바 선택을 갱신하고 다이얼로그를 닫는다 */
  onSelectSession: (sessionId: string) => void;
  onClose: () => void;
}>) {
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tAccessibility = useTranslations("Accessibility");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const sessionsByDate = useMemo(() => {
    const byDate = new Map<string, Session[]>();
    for (const session of sessions) {
      if (!session.dateKey) continue;
      byDate.set(session.dateKey, [...(byDate.get(session.dateKey) ?? []), session]);
    }
    return byDate;
  }, [sessions]);
  const bookableDates = useMemo(
    () =>
      new Set(
        [...sessionsByDate.entries()]
          .filter(([, dateSessions]) => dateSessions.some((session) => session.spotsLeft > 0))
          .map(([dateKey]) => dateKey),
      ),
    [sessionsByDate],
  );
  const firstBookableDate = useMemo(
    () => [...bookableDates].sort((a, b) => a.localeCompare(b))[0] ?? null,
    [bookableDates],
  );
  const selectedSessionDate =
    sessions.find((session) => session.id === selectedSessionId)?.dateKey ?? null;
  const initialDate = selectedSessionDate ?? firstBookableDate;

  const currentMonth = toMonthKey(getSeoulNowParts().date);
  const lastSessionMonth = useMemo(() => {
    const months = [...sessionsByDate.keys()].map(toMonthKey).sort((a, b) => a.localeCompare(b));
    return months[months.length - 1] ?? currentMonth;
  }, [currentMonth, sessionsByDate]);
  const minMonth = currentMonth;
  const maxMonth = lastSessionMonth < minMonth ? minMonth : lastSessionMonth;

  const [viewMonth, setViewMonth] = useState(() => {
    const initial = initialDate ? toMonthKey(initialDate) : currentMonth;
    if (initial < minMonth) return minMonth;
    if (initial > maxMonth) return maxMonth;
    return initial;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const cellDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [locale],
  );
  const monthTitleFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        timeZone: "UTC",
        year: "numeric",
        month: "long",
      }),
    [locale],
  );
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
        timeZone: "UTC",
        weekday: "short",
      }),
    [locale],
  );
  const weatherTemperatureFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US", {
        maximumFractionDigits: 1,
      }),
    [locale],
  );
  // 2023-01-01은 일요일 — 일~토 순서의 요일 표기를 만든다
  const weekdayLabels = Array.from({ length: WEEK_LENGTH }, (_, index) =>
    weekdayFormatter.format(new Date(Date.UTC(2023, 0, 1 + index))),
  );

  const monthCells = buildMonthCells(viewMonth);
  const monthTitle = monthTitleFormatter.format(
    new Date(Date.UTC(Number(viewMonth.slice(0, 4)), Number(viewMonth.slice(5, 7)) - 1, 1)),
  );
  const hasBookableDateInMonth = [...bookableDates].some(
    (dateKey) => toMonthKey(dateKey) === viewMonth,
  );
  const selectedSessions = selectedDate ? (sessionsByDate.get(selectedDate) ?? []) : [];
  const selectedDateLabel = selectedSessions[0]?.dateLabel ?? "";
  const weatherConditionLabels: Record<WeatherCondition, string> = {
    CLEAR: t("weatherConditions.clear"),
    PARTLY_CLOUDY: t("weatherConditions.partlyCloudy"),
    CLOUDY: t("weatherConditions.cloudy"),
    RAIN: t("weatherConditions.rain"),
    RAIN_SNOW: t("weatherConditions.rainSnow"),
    SNOW: t("weatherConditions.snow"),
    SHOWER: t("weatherConditions.shower"),
  };
  const hasVisibleWeather = selectedSessions.some(
    (session) => getSessionWeather(session, weather) !== null,
  );

  function formatCellDate(dateKey: string) {
    return cellDateFormatter.format(
      new Date(
        Date.UTC(
          Number(dateKey.slice(0, 4)),
          Number(dateKey.slice(5, 7)) - 1,
          Number(dateKey.slice(8, 10)),
        ),
      ),
    );
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="availability-calendar-title"
      onClose={onClose}
      className="motion-dialog m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-md md:rounded-2xl md:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="availability-calendar-title" className="font-display text-xl font-bold text-ink">
            {t("availability")}
          </h2>
          <p className="mt-1 text-xs text-muted">{t("kstNotice")}</p>
        </div>
        <button
          type="button"
          aria-label={tAccessibility("closeDialog")}
          onClick={onClose}
          className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:border hover:border-primary hover:text-primary"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          aria-label={t("previousMonth")}
          disabled={viewMonth <= minMonth}
          onClick={() => setViewMonth((month) => shiftMonthKey(month, -1))}
          className="flex size-9 items-center justify-center rounded-full border border-line-soft bg-canvas-soft text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-30"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <p className="font-display text-sm font-bold text-ink">{monthTitle}</p>
        <button
          type="button"
          aria-label={t("nextMonth")}
          disabled={viewMonth >= maxMonth}
          onClick={() => setViewMonth((month) => shiftMonthKey(month, 1))}
          className="flex size-9 items-center justify-center rounded-full border border-line-soft bg-canvas-soft text-ink transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-30"
        >
          <ArrowRightIcon className="size-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {weekdayLabels.map((label) => (
          <span key={label} className="py-1 text-xs font-semibold text-muted">
            {label}
          </span>
        ))}
        {monthCells.map((dateKey, index) => {
          if (!dateKey) {
            return <span key={`empty-${viewMonth}-${index}`} aria-hidden />;
          }
          const bookable = bookableDates.has(dateKey);
          const selected = dateKey === selectedDate;
          const day = Number(dateKey.slice(8, 10));
          if (!bookable) {
            return (
              <span
                key={dateKey}
                className="flex aspect-square items-center justify-center rounded-full text-sm text-muted/50"
              >
                {day}
              </span>
            );
          }

          return (
            <button
              key={dateKey}
              type="button"
              aria-label={t("selectDate", { date: formatCellDate(dateKey) })}
              aria-pressed={selected}
              onClick={() => setSelectedDate(dateKey)}
              className={`flex aspect-square items-center justify-center rounded-full border font-display text-sm font-bold transition-colors ${
                selected
                  ? "border-primary bg-primary text-on-primary shadow-[0_6px_14px_rgba(209,63,50,0.3)]"
                  : "border-primary/50 bg-canvas-soft text-primary hover:border-primary"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      {!hasBookableDateInMonth ? (
        <p className="mt-3 text-center text-sm text-muted">{t("noDatesThisMonth")}</p>
      ) : null}

      {selectedDate ? (
        <div className="mt-5 border-t border-line-soft pt-4">
          <p className="font-display text-sm font-bold text-ink">
            {t("availableTimes")}
            {selectedDateLabel ? (
              <span className="ml-2 font-sans text-xs font-medium text-muted">
                {selectedDateLabel}
              </span>
            ) : null}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {selectedSessions.map((session) => {
              const slotSelected = session.id === selectedSessionId;
              const sessionWeather = getSessionWeather(session, weather);
              const weatherTooltipId = `weather-tooltip-${session.id}`;

              return (
                <li key={session.id}>
                  <button
                    type="button"
                    disabled={session.spotsLeft === 0}
                    aria-pressed={slotSelected}
                    aria-describedby={sessionWeather ? weatherTooltipId : undefined}
                    onClick={() => onSelectSession(session.id)}
                    className={`group/slot flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-colors disabled:cursor-not-allowed ${
                      slotSelected
                        ? "border-primary bg-primary text-on-primary"
                        : "border-line-soft bg-canvas-soft text-ink enabled:hover:border-primary enabled:hover:text-primary disabled:bg-panel disabled:text-muted"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      {sessionWeather ? (
                        <span className="group/weather relative flex shrink-0 items-center">
                          <span
                            role="img"
                            aria-label={weatherConditionLabels[sessionWeather.condition]}
                            className={`flex items-center justify-center ${
                              slotSelected ? "size-7 rounded-full bg-white shadow-sm" : "size-5"
                            } ${getWeatherIconColor(sessionWeather.condition)}`}
                          >
                            <WeatherConditionIcon
                              condition={sessionWeather.condition}
                              className="size-5 shrink-0"
                            />
                          </span>
                          <span
                            id={weatherTooltipId}
                            role="tooltip"
                            className="invisible absolute bottom-full left-0 z-20 mb-2 w-max max-w-56 rounded-lg bg-ink px-3 py-2 text-left font-sans text-xs text-white opacity-0 shadow-lg transition-opacity group-hover/weather:visible group-hover/weather:opacity-100 group-focus-visible/slot:visible group-focus-visible/slot:opacity-100"
                          >
                            <span className="block font-bold">
                              {weatherConditionLabels[sessionWeather.condition]}
                            </span>
                            <span className="mt-1 block text-white/85">
                              {t("weatherTemperature", {
                                temperature: weatherTemperatureFormatter.format(
                                  sessionWeather.temperatureCelsius,
                                ),
                              })}
                            </span>
                            <span className="block text-white/85">
                              {sessionWeather.precipitationProbability === null
                                ? t("weatherPrecipitationUnavailable")
                                : t("weatherPrecipitation", {
                                    percent: sessionWeather.precipitationProbability,
                                  })}
                            </span>
                            <span className="block text-white/65">
                              {t("weatherForecastTime", {
                                time:
                                  formatSeoulTime(sessionWeather.forecastAt, locale) ??
                                  session.timeLabel,
                              })}
                            </span>
                          </span>
                        </span>
                      ) : null}
                      <span className="font-display text-sm font-bold">
                        {formatSessionTimeRange(session, durationMinutes, locale)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold">
                      {t("remaining", { count: session.spotsLeft })}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {hasVisibleWeather ? (
            <p className="mt-3 text-right text-[11px] font-medium text-muted">
              {t("weatherAttribution")}
            </p>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
