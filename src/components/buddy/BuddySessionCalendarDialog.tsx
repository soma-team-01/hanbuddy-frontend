"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "@/components/ui/icons";
import { useModalDialog } from "@/components/ui/use-modal-dialog";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import { isClosedApplicationStatus, isPaidApplicationStatus } from "@/lib/application-approval";
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
  weekDateKeys,
} from "@/lib/buddy-calendar";
import { formatSeoulTime, getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import { myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { ActivityScheduleResponse } from "@/types/buddy";

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
  const cancellation = useTranslations("ScheduleCancellation");
  const { dialogRef, closeRef } = useModalDialog();
  const titleId = useId();
  const query = useQuery(myActivityQueryOptions(activityId));
  const initialDate = getSeoulDateTimeParts(startAt)?.date ?? getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [month, setMonth] = useState(monthKeyOf(initialDate));

  // Booking capacity and date summaries cannot identify cancellation/rejection-only
  // sessions. Inspect owner records for the visible month with bounded concurrency.
  const allSchedules = (query.data?.schedules ?? [])
    .flatMap((schedule) => {
      const parts = getSeoulDateTimeParts(schedule.startAt);
      return parts ? [{ ...schedule, date: parts.date, time: parts.time }] : [];
    })
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.scheduleId - b.scheduleId);
  const monthSchedules = allSchedules.filter((schedule) => monthKeyOf(schedule.date) === month);
  const run = useMemo(() => createDashboardRequestQueue(), []);
  const records = useQueries({
    queries: monthSchedules.map((schedule) =>
      dashboardSessionQueryOptions(schedule.scheduleId, getContentLanguage(locale), run),
    ),
  });
  useAuthQueryRedirect(
    records.find((record) => isUnauthenticatedError(record.error))?.error ?? query.error,
  );
  const recordsPending = records.some((record) => record.isPending);
  const recordsError = records.some((record) => record.isError);
  const schedules =
    recordsPending || recordsError
      ? []
      : monthSchedules.filter((schedule, index) => {
          const data = records[index].data;
          return (
            data?.activityId === activityId &&
            data.activityScheduleId === schedule.scheduleId &&
            data.applicants.some(
              (applicant) =>
                isPaidApplicationStatus(applicant.status) ||
                isClosedApplicationStatus(applicant.status),
            )
          );
        });
  const dates = new Set(schedules.map((schedule) => schedule.date));
  // Keep navigation available even when the current month has no application records.
  const months = allSchedules
    .map((schedule) => monthKeyOf(schedule.date))
    .concat(monthKeyOf(initialDate))
    .sort();
  const selectedSchedules = schedules.filter(
    (schedule) => schedule.date === selectedDate && monthKeyOf(selectedDate) === month,
  );
  const dateFormatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      className="motion-dialog m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-canvas-soft p-6 text-ink shadow-2xl backdrop:bg-ink/45 backdrop:backdrop-blur-[3px] max-md:mt-auto md:m-auto md:w-[calc(100%-3rem)] md:max-w-xl md:rounded-2xl md:p-7"
    >
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
      {query.isPending ? (
        <p role="status" className="py-10 text-center text-sm text-muted">
          {t("loadingRecords")}
        </p>
      ) : query.isError ? (
        <div role="alert" className="py-8 text-center text-sm text-muted">
          <p>{t("sessionsLoadError")}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="min-h-11 underline disabled:opacity-50"
          >
            {t("retryRecords")}
          </button>
        </div>
      ) : !allSchedules.length ? (
        <p className="py-10 text-center text-sm text-muted">{t("noCalendarSessions")}</p>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between md:mx-auto md:max-w-sm">
            <button
              type="button"
              aria-label={calendar("previousMonth")}
              disabled={month <= months[0]}
              onClick={() => setMonth(addMonthsToMonthKey(month, -1))}
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
              disabled={month >= months[months.length - 1]}
              onClick={() => setMonth(addMonthsToMonthKey(month, 1))}
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
            {monthGridDateKeys(month).map((date, index) =>
              !date ? (
                <span key={`empty-${index}`} aria-hidden="true" />
              ) : dates.has(date) ? (
                <button
                  key={date}
                  type="button"
                  aria-label={calendar("selectDate", {
                    date: dateFormatter.format(new Date(`${date}T00:00:00Z`)),
                  })}
                  aria-pressed={date === selectedDate}
                  onClick={() => setSelectedDate(date)}
                  className={`flex aspect-square items-center justify-center rounded-full border font-display text-sm font-bold ${date === selectedDate ? "border-primary bg-primary text-on-primary shadow-[0_6px_14px_rgba(209,63,50,0.3)]" : "border-primary/50 text-primary hover:border-primary"}`}
                >
                  {Number(date.slice(-2))}
                </button>
              ) : (
                <span
                  key={date}
                  className="flex aspect-square items-center justify-center text-sm text-muted/50"
                >
                  {Number(date.slice(-2))}
                </span>
              ),
            )}
          </div>
          {recordsError ? (
            <div role="alert" className="mt-3 text-center text-sm text-muted">
              <p>{t("sessionsLoadError")}</p>
              <button
                type="button"
                onClick={() => {
                  records
                    .filter((record) => record.isError)
                    .forEach((record) => void record.refetch());
                }}
                disabled={records.some((record) => record.isFetching)}
                className="min-h-11 underline disabled:opacity-50"
              >
                {t("retryRecords")}
              </button>
            </div>
          ) : recordsPending ? (
            <p role="status" className="mt-3 text-center text-sm text-muted">
              {t("loadingRecords")}
            </p>
          ) : !dates.size ? (
            <p className="mt-3 text-center text-sm text-muted">{t("noCalendarSessions")}</p>
          ) : null}
          {selectedSchedules.length > 0 ? (
            <div className="mt-5 border-t border-line-soft pt-4">
              <h3 className="font-display text-sm font-bold">{t("sessionTimes")}</h3>
              {(["morning", "afternoon"] as const).map((period) => {
                const times = selectedSchedules.filter(
                  (schedule) => Number(schedule.time.slice(0, 2)) < 12 === (period === "morning"),
                );
                if (!times.length) return null;
                return (
                  <div
                    key={period}
                    role="group"
                    aria-label={calendar(`timePeriods.${period}`)}
                    className="mt-4"
                  >
                    <p className="mb-2 text-xs font-semibold text-muted">
                      {calendar(`timePeriods.${period}`)}
                    </p>
                    <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                      {times.map((schedule) => {
                        const end =
                          query.data.totalDurationMinutes > 0
                            ? formatSeoulTime(
                                new Date(
                                  Date.parse(schedule.startAt) +
                                    query.data.totalDurationMinutes * 60_000,
                                ).toISOString(),
                                locale,
                              )
                            : null;
                        return (
                          <li key={schedule.scheduleId} className="min-w-0">
                            <button
                              type="button"
                              aria-pressed={schedule.scheduleId === selectedScheduleId}
                              onClick={() => {
                                const original = query.data.schedules.find(
                                  (item) => item.scheduleId === schedule.scheduleId,
                                );
                                if (original) onSelect(original);
                              }}
                              className={`flex h-full min-h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border px-2 py-3 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${schedule.scheduleId === selectedScheduleId ? "border-primary bg-primary-soft text-primary-strong ring-1 ring-primary" : "border-line-soft hover:border-primary"}`}
                            >
                              <span className="font-display text-sm font-semibold">
                                {formatSeoulTime(schedule.startAt, locale)}
                              </span>
                              {end ? <span className="text-xs text-muted">~ {end}</span> : null}
                              {schedule.status === "CANCELLED" ? (
                                <span className="text-xs text-muted">
                                  {cancellation("cancelled")}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </dialog>
  );
}
