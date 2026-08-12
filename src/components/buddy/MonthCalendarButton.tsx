"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { getSeoulDateTimeParts } from "@/lib/datetime";
import { buddyScheduleDatesQueryOptions } from "@/lib/query/buddy";
import {
  addMonthsToMonthKey,
  dayNumberOf,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthGridDateKeys,
  monthKeyOf,
  weekDateKeys,
} from "@/lib/buddy-calendar";

/**
 * 주간 스트립 옆의 달력 버튼과 월 캘린더 팝오버.
 * 날짜를 고르면 그 날짜가 선택되고, 배경의 주간 스트립도 해당 주로 넘어간다.
 */
export function MonthCalendarButton({
  locale,
  selectedDate,
  todayDate,
  onSelectDate,
  fixedActivityDates,
}: Readonly<{
  locale: Locale;
  selectedDate: string;
  todayDate: string;
  onSelectDate: (dateKey: string) => void;
  /** 주어지면 버디 전체 일정 대신 이 날짜 목록으로 점을 찍는다 (활동 하나만 볼 때) */
  fixedActivityDates?: ReadonlySet<string>;
}>) {
  const t = useTranslations("BuddyDashboard");
  const [open, setOpen] = useState(false);
  // 선택된 날짜가 아직 없으면 오늘이 속한 달부터 보여준다 (빈 문자열이면 격자가 비고 제목이 깨진다)
  const [monthKey, setMonthKey] = useState(() => monthKeyOf(selectedDate || todayDate));

  // 보고 있는 달의 활동 점 — 달을 넘길 때마다 그 달만 조회한다 (백엔드 상한 42일 안)
  const monthGrid = monthGridDateKeys(monthKey);
  const monthDates = monthGrid.filter((dateKey): dateKey is string => dateKey !== null);
  const monthQuery = useQuery({
    ...buddyScheduleDatesQueryOptions({
      from: monthDates[0],
      to: monthDates.at(-1) ?? monthDates[0],
    }),
    enabled: open && monthDates.length > 0 && fixedActivityDates === undefined,
  });
  const activityDates =
    fixedActivityDates ??
    new Set(
      (monthQuery.data ?? [])
        .filter(({ hasActivity }) => hasActivity)
        .map(({ dateStartAt }) => getSeoulDateTimeParts(dateStartAt)?.date ?? "")
        .filter((dateKey) => dateKey.length > 0),
    );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  // 일~토 요일 머리글은 아무 주에서나 뽑아도 같다
  const weekdayLabels = weekDateKeys(todayDate).map((dateKey) =>
    formatDateKeyWeekday(dateKey, locale),
  );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("openCalendar")}
        onClick={() => {
          // 다시 열 때는 선택된 날짜의 달부터 보여준다
          if (!open) setMonthKey(monthKeyOf(selectedDate || todayDate));
          setOpen((current) => !current);
        }}
        className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
          open
            ? "border-primary text-primary"
            : "border-line-soft text-ink hover:border-primary hover:text-primary"
        }`}
      >
        <CalendarIcon className="size-4" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t("openCalendar")}
          className="absolute top-[calc(100%+8px)] right-0 z-50 w-72 rounded-2xl border border-line-soft bg-canvas-soft p-3 shadow-[0_18px_48px_rgba(38,27,24,0.14)]"
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <p className="font-display text-sm font-bold text-ink">
              {formatMonthKeyTitle(monthKey, locale)}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t("previousMonth")}
                onClick={() => setMonthKey(addMonthsToMonthKey(monthKey, -1))}
                className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
              >
                <ArrowLeftIcon className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={t("nextMonth")}
                onClick={() => setMonthKey(addMonthsToMonthKey(monthKey, 1))}
                className="flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
              >
                <ArrowRightIcon className="size-3.5" />
              </button>
            </div>
          </div>

          <div aria-hidden className="grid grid-cols-7 pb-1">
            {weekdayLabels.map((label) => (
              <span key={label} className="py-1 text-center text-[10px] font-semibold text-muted">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {monthGrid.map((dateKey, index) => {
              if (!dateKey) return <span key={`pad-${index}`} aria-hidden />;

              const isSelected = dateKey === selectedDate;
              const isToday = dateKey === todayDate;
              const hasActivity = activityDates.has(dateKey);
              let dayClass = "border-transparent text-ink hover:border-line-strong";
              if (isSelected) dayClass = "border-primary bg-primary font-bold text-on-primary";
              else if (isToday) dayClass = "border-line-strong font-bold text-ink";

              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={
                    hasActivity
                      ? t("dateWithActivity", { date: formatDateKeyLongLabel(dateKey, locale) })
                      : formatDateKeyLongLabel(dateKey, locale)
                  }
                  onClick={() => {
                    onSelectDate(dateKey);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  className={`mx-auto flex size-9 flex-col items-center justify-center rounded-full border text-xs transition-colors ${dayClass}`}
                >
                  <span className="tabular-nums">{dayNumberOf(dateKey)}</span>
                  <span
                    aria-hidden
                    className={`size-1 rounded-full ${
                      hasActivity ? (isSelected ? "bg-on-primary" : "bg-primary") : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// aria-label에는 팝오버 밖 표기와 같은 긴 형식을 쓴다
function formatDateKeyLongLabel(dateKey: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00Z`));
}
