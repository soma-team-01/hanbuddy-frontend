"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import {
  isClosedApplicationStatus,
  isSubmittedApplicationStatus,
} from "@/lib/application-approval";
import { isUnauthenticatedError } from "@/lib/api/errors";
import {
  createDashboardRequestQueue,
  dashboardSessionQueryOptions,
} from "@/lib/query/buddy-dashboard";
import {
  addMonthsToMonthKey,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthGridDateKeys,
  monthKeyOf,
  weekdayIndexOf,
  weekDateKeys,
} from "@/lib/buddy-calendar";
import { formatSeoulTime, getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import { myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ActivityScheduleResponse } from "@/types/buddy";

type CalendarSchedule = { schedule: ActivityScheduleResponse; date: string; time: string };

/** Converts owner schedules to valid KST calendar entries, preserving historical sessions. */
function calendarSchedules(schedules: ActivityScheduleResponse[]): CalendarSchedule[] {
  return schedules
    .flatMap((schedule) => {
      const parts = getSeoulDateTimeParts(schedule.startAt);
      return parts ? [{ schedule, date: parts.date, time: parts.time }] : [];
    })
    .sort(
      (a, b) =>
        Date.parse(a.schedule.startAt) - Date.parse(b.schedule.startAt) ||
        a.schedule.scheduleId - b.schedule.scheduleId,
    );
}

/** Loads only the visible month's records; capacity cannot identify cancellation-only sessions. */
function useSessionCalendar(activityId: number, month: string, locale: Locale) {
  const query = useQuery(myActivityQueryOptions(activityId));
  const allSchedules = calendarSchedules(query.data?.schedules ?? []);
  const monthSchedules = allSchedules.filter((item) => monthKeyOf(item.date) === month);
  const run = useMemo(() => createDashboardRequestQueue(), []);
  const records = useQueries({
    queries: monthSchedules.map(({ schedule }) =>
      dashboardSessionQueryOptions(schedule.scheduleId, getContentLanguage(locale), run),
    ),
  });
  useAuthQueryRedirect(
    records.find((record) => isUnauthenticatedError(record.error))?.error ?? query.error,
  );
  const pending = records.some((record) => record.isPending);
  const error = records.some((record) => record.isError);
  const schedules =
    pending || error
      ? []
      : monthSchedules.filter(({ schedule }, index) => {
          const data = records[index].data;
          return (
            data?.activityId === activityId &&
            data.activityScheduleId === schedule.scheduleId &&
            data.applicants.some(
              (applicant) =>
                isSubmittedApplicationStatus(applicant.status) ||
                isClosedApplicationStatus(applicant.status),
            )
          );
        });
  return {
    query,
    allSchedules,
    schedules,
    pending,
    error,
    fetching: records.some((record) => record.isFetching),
    retry: () => {
      records.filter((record) => record.isError).forEach((record) => void record.refetch());
    },
  };
}

/** Announces loading, retryable errors or an empty result without conflating those states. */
function CalendarFeedback({
  pending,
  error,
  empty,
  fetching,
  retry,
}: Readonly<{
  pending: boolean;
  error: boolean;
  empty: boolean;
  fetching: boolean;
  retry: () => void;
}>) {
  const t = useTranslations("BuddyDashboard");
  if (error)
    return (
      <div role="alert" className="mt-3 text-center text-sm text-muted">
        <p>{t("sessionsLoadError")}</p>
        <button
          type="button"
          onClick={retry}
          disabled={fetching}
          className="min-h-11 underline disabled:opacity-50"
        >
          {t("retryRecords")}
        </button>
      </div>
    );
  if (pending)
    return (
      <output className="mt-3 block text-center text-sm text-muted">{t("loadingRecords")}</output>
    );
  if (empty)
    return <p className="mt-3 text-center text-sm text-muted">{t("noCalendarSessions")}</p>;
  return null;
}

/** Renders a real date; CSS positions the first day without index-keyed placeholder cells. */
function CalendarDay({
  date,
  available,
  selected,
  onSelect,
  locale,
}: Readonly<{
  date: string;
  available: boolean;
  selected: boolean;
  onSelect: (date: string) => void;
  locale: Locale;
}>) {
  const calendar = useTranslations("ActivityDetail");
  const day = Number(date.slice(-2));
  const style = day === 1 ? { gridColumnStart: weekdayIndexOf(date) + 1 } : undefined;
  if (!available)
    return (
      <span
        style={style}
        className="flex aspect-square items-center justify-center text-sm text-muted/50"
      >
        {day}
      </span>
    );
  const label = new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
  const tone = selected
    ? "border-primary bg-primary text-on-primary shadow-[0_6px_14px_rgba(209,63,50,0.3)]"
    : "border-primary/50 text-primary hover:border-primary";
  return (
    <button
      type="button"
      style={style}
      aria-label={calendar("selectDate", { date: label })}
      aria-pressed={selected}
      onClick={() => onSelect(date)}
      className={
        "flex aspect-square items-center justify-center rounded-full border font-display text-sm font-bold " +
        tone
      }
    >
      {day}
    </button>
  );
}

/** Keeps month navigation available even when the current month has no application records. */
function CalendarMonth({
  month,
  months,
  dates,
  selectedDate,
  onMonth,
  onDate,
  locale,
}: Readonly<{
  month: string;
  months: string[];
  dates: Set<string>;
  selectedDate: string;
  onMonth: (month: string) => void;
  onDate: (date: string) => void;
  locale: Locale;
}>) {
  const calendar = useTranslations("ActivityDetail");
  return (
    <>
      <div className="mt-5 flex items-center justify-between md:mx-auto md:max-w-sm">
        <button
          type="button"
          aria-label={calendar("previousMonth")}
          disabled={month <= months[0]}
          onClick={() => onMonth(addMonthsToMonthKey(month, -1))}
          className="flex size-11 items-center justify-center rounded-full border border-line-soft hover:text-primary disabled:opacity-30"
        >
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
        </button>
        <p aria-live="polite" className="font-display text-sm font-bold">
          {formatMonthKeyTitle(month, locale)}
        </p>
        <button
          type="button"
          aria-label={calendar("nextMonth")}
          disabled={month >= (months.at(-1) ?? month)}
          onClick={() => onMonth(addMonthsToMonthKey(month, 1))}
          className="flex size-11 items-center justify-center rounded-full border border-line-soft hover:text-primary disabled:opacity-30"
        >
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center md:mx-auto md:max-w-sm">
        {weekDateKeys("2023-01-01").map((date) => (
          <span key={date} className="py-1 text-xs font-semibold text-muted">
            {formatDateKeyWeekday(date, locale)}
          </span>
        ))}
        {monthGridDateKeys(month)
          .filter((date): date is string => date !== null)
          .map((date) => (
            <CalendarDay
              key={date}
              date={date}
              available={dates.has(date)}
              selected={date === selectedDate}
              onSelect={onDate}
              locale={locale}
            />
          ))}
      </div>
    </>
  );
}

/** Offers a recorded session regardless of booking eligibility, returning the original API object. */
function CalendarTime({
  schedule,
  duration,
  selected,
  onSelect,
  locale,
}: Readonly<{
  schedule: ActivityScheduleResponse;
  duration: number;
  selected: boolean;
  onSelect: (schedule: ActivityScheduleResponse) => void;
  locale: Locale;
}>) {
  const cancellation = useTranslations("ScheduleCancellation");
  const end =
    duration > 0
      ? formatSeoulTime(
          new Date(Date.parse(schedule.startAt) + duration * 60_000).toISOString(),
          locale,
        )
      : null;
  const tone = selected
    ? "border-primary bg-primary-soft text-primary-strong ring-1 ring-primary"
    : "border-line-soft hover:border-primary";
  return (
    <li className="min-w-0">
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(schedule)}
        className={
          "flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
          tone
        }
      >
        <span className="font-display text-sm font-semibold">
          {formatSeoulTime(schedule.startAt, locale)}
        </span>
        {end && <span className="text-xs text-muted">~ {end}</span>}
        {schedule.status === "CANCELLED" && (
          <span className="text-xs text-muted">{cancellation("cancelled")}</span>
        )}
      </button>
    </li>
  );
}

/** Groups selectable times into native, labelled morning/afternoon fieldsets. */
function CalendarTimes({
  schedules,
  duration,
  selectedScheduleId,
  onSelect,
  locale,
}: Readonly<{
  schedules: CalendarSchedule[];
  duration: number;
  selectedScheduleId: number;
  onSelect: (schedule: ActivityScheduleResponse) => void;
  locale: Locale;
}>) {
  const t = useTranslations("BuddyDashboard");
  const calendar = useTranslations("ActivityDetail");
  if (!schedules.length) return null;
  return (
    <div className="mt-5 border-t border-line-soft pt-4">
      <h3 className="font-display text-sm font-bold">{t("sessionTimes")}</h3>
      {(["morning", "afternoon"] as const).map((period) => {
        const times = schedules.filter(
          (item) => Number(item.time.slice(0, 2)) < 12 === (period === "morning"),
        );
        if (!times.length) return null;
        return (
          <fieldset key={period} className="mt-4 min-w-0 border-0 p-0">
            <legend className="mb-2 text-xs font-semibold text-muted">
              {calendar(`timePeriods.${period}`)}
            </legend>
            <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
              {times.map(({ schedule }) => (
                <CalendarTime
                  key={schedule.scheduleId}
                  schedule={schedule}
                  duration={duration}
                  selected={schedule.scheduleId === selectedScheduleId}
                  onSelect={onSelect}
                  locale={locale}
                />
              ))}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}

/** Separates owner-query feedback from month navigation and per-session feedback. */
function CalendarContent({
  data,
  initialDate,
  selectedDate,
  month,
  selectedScheduleId,
  onDate,
  onMonth,
  onSelect,
  locale,
}: Readonly<{
  data: ReturnType<typeof useSessionCalendar>;
  initialDate: string;
  selectedDate: string;
  month: string;
  selectedScheduleId: number;
  onDate: (date: string) => void;
  onMonth: (month: string) => void;
  onSelect: (schedule: ActivityScheduleResponse) => void;
  locale: Locale;
}>) {
  const { query, allSchedules, schedules } = data;
  if (!query.data || query.isError || !allSchedules.length)
    return (
      <CalendarFeedback
        pending={query.isPending}
        error={query.isError}
        empty={!allSchedules.length}
        fetching={query.isFetching}
        retry={() => void query.refetch()}
      />
    );
  const months = allSchedules
    .map((item) => monthKeyOf(item.date))
    .concat(monthKeyOf(initialDate))
    .sort((left, right) => left.localeCompare(right));
  const dates = new Set(schedules.map((item) => item.date));
  return (
    <>
      <CalendarMonth
        month={month}
        months={months}
        dates={dates}
        selectedDate={selectedDate}
        onDate={onDate}
        onMonth={onMonth}
        locale={locale}
      />
      <CalendarFeedback
        pending={data.pending}
        error={data.error}
        empty={!dates.size}
        fetching={data.fetching}
        retry={data.retry}
      />
      <CalendarTimes
        schedules={schedules.filter((item) => item.date === selectedDate)}
        duration={query.data.totalDurationMinutes}
        selectedScheduleId={selectedScheduleId}
        onSelect={onSelect}
        locale={locale}
      />
    </>
  );
}

/** Opens an accessible owner-session picker with recorded dates, KST times and focus restoration. */
export function BuddySessionCalendarDialog({
  activityId,
  selectedScheduleId,
  startAt,
  onSelect,
  onClose,
}: Readonly<{
  activityId: number;
  selectedScheduleId: number;
  startAt: string;
  onSelect: (schedule: ActivityScheduleResponse) => void;
  onClose: () => void;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("BuddyDashboard");
  const calendar = useTranslations("ActivityDetail");
  const accessibility = useTranslations("Accessibility");
  const { dialogRef, closeRef } = useModalDialog();
  const titleId = useId();
  const initialDate = getSeoulDateTimeParts(startAt)?.date ?? getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [month, setMonth] = useState(monthKeyOf(initialDate));
  const data = useSessionCalendar(activityId, month, locale);
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-ink backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] open:flex open:items-end open:justify-center md:open:items-center"
    >
      <button
        type="button"
        data-testid="session-calendar-backdrop"
        aria-label={accessibility("closeDialog")}
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="motion-dialog relative z-10 max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-canvas-soft p-6 shadow-2xl md:w-[calc(100%-3rem)] md:max-w-xl md:rounded-2xl md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-xl font-bold">
              {t("selectSession")}
            </h2>
            <p className="mt-1 text-xs text-muted">{calendar("kstNotice")}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={accessibility("closeDialog")}
            onClick={onClose}
            className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary"
          >
            <XIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
        <CalendarContent
          data={data}
          initialDate={initialDate}
          selectedDate={selectedDate}
          month={month}
          selectedScheduleId={selectedScheduleId}
          onDate={setSelectedDate}
          onMonth={setMonth}
          onSelect={onSelect}
          locale={locale}
        />
      </div>
    </dialog>
  );
}
