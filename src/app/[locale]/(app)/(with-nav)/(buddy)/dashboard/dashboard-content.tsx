"use client";
import { DashboardApplicationsList } from "@/components/buddy/DashboardActivityCard";
import { PendingReservationInbox } from "@/components/buddy/PendingReservationInbox";

import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { ApplicantProfileDialog } from "@/components/buddy/ApplicantProfileDialog";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/ui/icons";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import type { Locale } from "@/i18n/routing";
import { getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import {
  buddyApplicationsQueryOptions,
  buddyKeys,
  buddyScheduleDatesQueryOptions,
  myActivitiesQueryOptions,
} from "@/lib/query/buddy";
import { myChatRoomsCacheQueryOptions } from "@/lib/query/chat";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { BuddyApplicationApplicantSummaryResponse } from "@/types/buddy";
import {
  addDaysToDateKey,
  dayNumberOf,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthKeyOf,
  weekDateKeys,
} from "@/lib/buddy-calendar";
import { MonthCalendarButton } from "@/components/buddy/MonthCalendarButton";
import type { DashboardSessionSelection } from "@/lib/buddy-session-navigation";

/** 섹션 머리글 */
function SectionHeading({ children }: Readonly<{ children: ReactNode }>) {
  return <h2 className="font-display text-lg font-bold text-ink">{children}</h2>;
}

export function DashboardContent({
  initialSession,
}: Readonly<{ initialSession?: DashboardSessionSelection }> = {}) {
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const t = useTranslations("BuddyDashboard");
  const queryClient = useQueryClient();
  const refreshingRecords = useIsFetching({ queryKey: buddyKeys.applications() }) > 0;
  const getApiErrorMessage = useApiErrorMessage();

  const todayDate = getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState(initialSession?.date ?? "");
  const [restoreInitialSession, setRestoreInitialSession] = useState(true);
  const [detailDate, setDetailDate] = useState<string | null>(null);
  // 주간 스트립이 보여주는 주. 화살표로만 움직이고 날짜 선택과는 분리되어 있다
  const [weekAnchor, setWeekAnchor] = useState("");
  const [profileApplicant, setProfileApplicant] =
    useState<BuddyApplicationApplicantSummaryResponse | null>(null);

  // 기본 창(오늘~15일) — 처음 보여줄 날짜를 고르는 데 쓴다
  const scheduleDatesQuery = useQuery(buddyScheduleDatesQueryOptions());
  const myActivitiesQuery = useQuery(myActivitiesQueryOptions());
  // 단체 채팅방이 이미 있는 회차 — 버튼 문구를 만들기/열기로 나눈다
  const chatRoomsQuery = useQuery(myChatRoomsCacheQueryOptions(language));
  const scheduleDates = (scheduleDatesQuery.data ?? [])
    .map(({ dateStartAt, hasActivity }) => ({
      date: getSeoulDateTimeParts(dateStartAt)?.date ?? "",
      hasActivity,
    }))
    .filter(({ date }) => date.length > 0);

  // 아직 고르지 않았으면 활동이 있는 첫 날짜, 없으면 오늘
  const defaultDate = scheduleDates.find(({ hasActivity }) => hasActivity)?.date ?? todayDate;
  const activeDate = selectedDate || defaultDate;
  const onDetailChange = useCallback(
    (open: boolean) => {
      setDetailDate(open ? activeDate : null);
    },
    [activeDate],
  );
  const anchor = weekAnchor || activeDate;
  const weekDates = weekDateKeys(anchor);

  // 보고 있는 주의 활동 점 — 주를 옮길 때마다 그 주만 조회한다 (과거·먼 미래 포함)
  const weekDatesQuery = useQuery(
    buddyScheduleDatesQueryOptions({ from: weekDates[0], to: weekDates[6] }),
  );
  const weekActivityDates = new Set(
    (weekDatesQuery.data ?? [])
      .filter(({ hasActivity }) => hasActivity)
      .map(({ dateStartAt }) => getSeoulDateTimeParts(dateStartAt)?.date ?? "")
      .filter((date) => date.length > 0),
  );

  // 일정이 로드되기 전에는 기본 날짜가 확정되지 않았으므로 신청자 조회를 미뤄 헛요청을 막는다
  const applicationsQuery = useQuery({
    ...buddyApplicationsQueryOptions(activeDate, language),
    enabled: Boolean(selectedDate) || !scheduleDatesQuery.isPending,
  });
  // Session details distinguish participants/cancellations; pending requests stay in the inbox.
  const activities = applicationsQuery.data ?? [];
  const restoringSession =
    restoreInitialSession && initialSession?.date === activeDate ? initialSession : undefined;
  const detailOpen =
    detailDate === activeDate &&
    !applicationsQuery.error &&
    (activities.length > 0 || Boolean(restoringSession));

  useAuthQueryRedirect(
    scheduleDatesQuery.error ??
      weekDatesQuery.error ??
      applicationsQuery.error ??
      myActivitiesQuery.error,
  );

  function selectDate(date: string) {
    setRestoreInitialSession(false);
    setSelectedDate(date);
    // 캘린더에서 다른 주의 날짜를 고르면 스트립도 그 주로 따라간다
    setWeekAnchor(date);
  }

  let applicationsContent: ReactNode;
  if (applicationsQuery.error) {
    applicationsContent = (
      <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
        {getApiErrorMessage(applicationsQuery.error, t("applicantsLoadError"))}
      </p>
    );
  } else if (applicationsQuery.isPending) {
    applicationsContent = (
      <p className="py-6 text-center text-sm text-muted">{t("loadingApplicants")}</p>
    );
  } else if (activities.length === 0 && !restoringSession) {
    applicationsContent = (
      <p className="rounded-2xl border border-dashed border-line-soft px-4 py-6 text-center text-sm text-muted">
        {t("noSessionRecords")}
      </p>
    );
  } else {
    applicationsContent = (
      <DashboardApplicationsList
        key={activeDate}
        activities={activities}
        myActivities={myActivitiesQuery.data ?? []}
        rooms={chatRoomsQuery.data ?? []}
        onOpenProfile={setProfileApplicant}
        onDetailChange={onDetailChange}
        initialSession={restoringSession}
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* 신청자 — 주간 스트립과 선택한 날짜의 신청자 목록을 한 섹션으로 묶는다 */}
      <section className="flex flex-col gap-2.5">
        <div className={detailOpen ? "hidden" : "flex flex-col gap-2.5"}>
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>{t("applicantsHeading")}</SectionHeading>
            <button
              type="button"
              disabled={refreshingRecords}
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: buddyKeys.applications() })
              }
              className="min-h-11 text-xs font-semibold text-muted underline underline-offset-4 hover:text-primary disabled:opacity-50"
            >
              {t("refreshRecords")}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-sm font-bold text-ink">
              {formatMonthKeyTitle(monthKeyOf(anchor), locale)}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={t("previousWeek")}
                onClick={() => setWeekAnchor(addDaysToDateKey(anchor, -7))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-soft text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
              <MonthCalendarButton
                locale={locale}
                selectedDate={activeDate}
                todayDate={todayDate}
                onSelectDate={selectDate}
              />
              <button
                type="button"
                aria-label={t("nextWeek")}
                onClick={() => setWeekAnchor(addDaysToDateKey(anchor, 7))}
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-soft text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </div>

          {weekDatesQuery.error ? (
            <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
              {getApiErrorMessage(weekDatesQuery.error, t("scheduleLoadError"))}
            </p>
          ) : null}

          <fieldset aria-label={t("scheduleDates")} className="grid grid-cols-7 gap-1 border-0 p-0">
            {weekDates.map((date) => {
              const isActive = date === activeDate;
              const isToday = date === todayDate;
              const hasActivity = weekActivityDates.has(date);
              const weekdayLabel = isToday ? t("today") : formatDateKeyWeekday(date, locale);
              const plainLabel = `${formatDateKeyWeekday(date, locale)} ${dayNumberOf(date)}`;

              return (
                <button
                  key={date}
                  type="button"
                  aria-pressed={isActive}
                  aria-label={
                    hasActivity ? t("dateWithActivity", { date: plainLabel }) : plainLabel
                  }
                  onClick={() => selectDate(date)}
                  className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl border py-2 transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-on-primary"
                      : "border-transparent text-ink hover:bg-panel"
                  }`}
                >
                  <span
                    className={`text-xs leading-4 font-semibold ${
                      isActive ? "text-on-primary" : isToday ? "text-primary" : "text-muted"
                    }`}
                  >
                    {weekdayLabel}
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums">
                    {dayNumberOf(date)}
                  </span>
                  <span
                    aria-hidden
                    className={`size-1 rounded-full ${
                      hasActivity ? (isActive ? "bg-on-primary" : "bg-primary") : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </fieldset>
        </div>

        <div className="mt-1.5">{applicationsContent}</div>
      </section>

      <div className={detailOpen ? "hidden" : ""}>
        <PendingReservationInbox />
      </div>

      {profileApplicant ? (
        <ApplicantProfileDialog
          applicant={profileApplicant}
          locale={locale}
          onClose={() => setProfileApplicant(null)}
        />
      ) : null}
    </div>
  );
}
