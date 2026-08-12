"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { Avatar } from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MapPinIcon,
  MessageSquareIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import {
  formatApplicantContact,
  formatNationalityCode,
  getActivityThumbnail,
} from "@/lib/api/buddy-view";
import type { Locale } from "@/i18n/routing";
import { formatSeoulTime, getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import {
  buddyApplicationsQueryOptions,
  buddyScheduleDatesQueryOptions,
  myActivitiesQueryOptions,
} from "@/lib/query/buddy";
import { myChatRoomsQueryOptions } from "@/lib/query/chat";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus } from "@/types/buddy";
import {
  addDaysToDateKey,
  dayNumberOf,
  formatDateKeyLong,
  formatDateKeyWeekday,
  formatMonthKeyTitle,
  monthKeyOf,
  weekDateKeys,
} from "./calendar";
import { MonthCalendarButton } from "./month-calendar";

/** 섹션 머리글 — 작은 대문자 눈썹 스타일로 위계만 잡고 자리는 아낀다 */
function SectionHeading({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <h2 className="font-display text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
      {children}
    </h2>
  );
}

const ACTIVITY_STATUS_TEXT_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "text-success",
  DRAFT: "text-muted",
  INACTIVE: "text-warning",
  DELETED: "text-danger",
};

export function DashboardContent() {
  const locale = useLocale() as Locale;
  const t = useTranslations("BuddyDashboard");
  const tMyActivities = useTranslations("MyActivities");
  const tChat = useTranslations("Chat");
  const getApiErrorMessage = useApiErrorMessage();

  const todayDate = getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState("");
  // 주간 스트립이 보여주는 주. 화살표로만 움직이고 날짜 선택과는 분리되어 있다
  const [weekAnchor, setWeekAnchor] = useState("");

  const scheduleDatesQuery = useQuery(buddyScheduleDatesQueryOptions());
  const myActivitiesQuery = useQuery(myActivitiesQueryOptions());
  // 단체 채팅방이 이미 있는 회차 — 버튼 문구를 만들기/열기로 나눈다
  const chatRoomsQuery = useQuery(myChatRoomsQueryOptions());
  const groupRoomScheduleIds = new Set(
    (chatRoomsQuery.data ?? [])
      .map((room) => room.activityScheduleId)
      .filter((scheduleId): scheduleId is number => scheduleId !== null),
  );

  const scheduleDates = (scheduleDatesQuery.data ?? [])
    .map(({ dateStartAt, hasActivity }) => ({
      date: getSeoulDateTimeParts(dateStartAt)?.date ?? "",
      hasActivity,
    }))
    .filter(({ date }) => date.length > 0);
  const activityDates = new Set(
    scheduleDates.filter(({ hasActivity }) => hasActivity).map(({ date }) => date),
  );

  // 아직 고르지 않았으면 활동이 있는 첫 날짜, 없으면 오늘
  const defaultDate = scheduleDates.find(({ hasActivity }) => hasActivity)?.date ?? todayDate;
  const activeDate = selectedDate || defaultDate;
  const anchor = weekAnchor || activeDate;
  const weekDates = weekDateKeys(anchor);

  // 일정이 로드되기 전에는 기본 날짜가 확정되지 않았으므로 신청자 조회를 미뤄 헛요청을 막는다
  const applicationsQuery = useQuery({
    ...buddyApplicationsQueryOptions(activeDate),
    enabled: Boolean(selectedDate) || !scheduleDatesQuery.isPending,
  });
  const activities = applicationsQuery.data ?? [];
  const myActivities = (myActivitiesQuery.data ?? []).filter(({ status }) => status !== "DELETED");
  const activeActivityCount = myActivities.filter(({ status }) => status === "ACTIVE").length;

  useAuthQueryRedirect(
    scheduleDatesQuery.error ?? applicationsQuery.error ?? myActivitiesQuery.error,
  );

  function selectDate(date: string) {
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
  } else if (activities.length === 0) {
    applicationsContent = (
      <p className="rounded-2xl border border-dashed border-line-soft px-4 py-6 text-center text-sm text-muted">
        {t("noApplicants")}
      </p>
    );
  } else {
    applicationsContent = (
      <div className="grid gap-3 lg:grid-cols-2">
        {activities.map((activity, activityIndex) => {
          const headerScheduleId = activity.schedules[0]?.activityScheduleId;
          const headerHref = headerScheduleId
            ? `/my-activities/${activity.activityId}/applicants?scheduleId=${headerScheduleId}`
            : `/my-activities/${activity.activityId}/applicants`;

          return (
            <article
              key={activity.activityId}
              className="flex flex-col gap-3 rounded-2xl border border-line-soft p-4"
            >
              <Link
                href={headerHref}
                className="-m-1 flex items-center gap-3 rounded-lg p-1 transition-colors hover:text-primary"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={getActivityThumbnail(activity.thumbnailImageUrl)}
                    alt={activity.activityTitle}
                    fill
                    loading={activityIndex === 0 ? "eager" : undefined}
                    sizes="40px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-bold text-ink">
                    {activity.activityTitle}
                  </h3>
                  <p className="text-xs font-semibold text-primary">
                    {t("applicantCount", { count: activity.totalApplicantCount })}
                  </p>
                </div>
              </Link>

              {activity.schedules.map((schedule) => (
                <section key={schedule.activityScheduleId} className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/my-activities/${activity.activityId}/applicants?scheduleId=${schedule.activityScheduleId}`}
                      className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-line-soft px-3 py-1.5 transition-colors hover:border-primary"
                    >
                      <span className="font-display text-xs font-bold text-ink">
                        {formatSeoulTime(schedule.startAt, locale) ?? "—"}
                      </span>
                      <span className="text-[11px] text-muted">
                        {t("applicantCount", { count: schedule.applicantCount })}
                      </span>
                    </Link>
                    {schedule.applicantCount > 0 ? (
                      // 한 번 만들면 이후 신청자는 자동으로 들어온다는 걸 누르기 전에 알려 준다
                      <span className="group relative inline-flex shrink-0">
                        <StartChatButton
                          target={{
                            kind: "group",
                            activityScheduleId: schedule.activityScheduleId,
                          }}
                          label={
                            groupRoomScheduleIds.has(schedule.activityScheduleId)
                              ? tChat("openGroupChat")
                              : tChat("createGroupChat")
                          }
                          icon={<UsersIcon className="size-3.5" />}
                          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary px-2.5 font-display text-[11px] font-bold text-primary transition-colors enabled:hover:bg-primary-soft disabled:opacity-60"
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute right-0 bottom-full z-40 mb-2 hidden w-60 rounded-xl border border-primary/30 bg-canvas-soft p-3 text-left text-xs leading-5 text-muted shadow-[0_12px_30px_rgba(61,45,43,0.14)] group-focus-within:block group-hover:block"
                        >
                          {tChat("autoJoinNotice")}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  {schedule.applicants.length > 0 ? (
                    <ul className="ml-2 flex flex-col gap-3 border-l border-line-soft pl-4">
                      {schedule.applicants.map((applicant) => (
                        <li key={applicant.applicationId} className="flex items-center gap-2.5">
                          <Avatar
                            name={applicant.applicantName}
                            src={applicant.applicantProfileImageUrl}
                            size={32}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-xs font-semibold text-ink">
                              {applicant.applicantName}
                            </p>
                            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted">
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="size-3" />
                                {formatNationalityCode(applicant.applicantNationalityCode, locale)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquareIcon className="size-3" />
                                {formatApplicantContact(applicant, locale)}
                              </span>
                            </p>
                          </div>
                          <StartChatButton
                            target={{ kind: "direct", targetUserId: applicant.applicantUserId }}
                            label={tChat("messageApplicant", { name: applicant.applicantName })}
                            icon={<MessageSquareIcon className="size-3.5" />}
                            labelHidden
                            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-muted transition-colors enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-60"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </article>
          );
        })}
      </div>
    );
  }

  let myActivitiesContent: ReactNode;
  if (myActivitiesQuery.error) {
    myActivitiesContent = (
      <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
        {getApiErrorMessage(myActivitiesQuery.error, t("activitiesLoadError"))}
      </p>
    );
  } else if (myActivitiesQuery.isPending) {
    myActivitiesContent = (
      <p className="py-4 text-center text-sm text-muted">{t("loadingActivities")}</p>
    );
  } else if (myActivities.length === 0) {
    myActivitiesContent = (
      <p className="rounded-2xl border border-dashed border-line-soft px-4 py-6 text-center text-sm text-muted">
        {t("noActivities")}
      </p>
    );
  } else {
    myActivitiesContent = (
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {myActivities.map((activity) => (
          <li key={activity.activityId}>
            <Link
              href={`/my-activities/${activity.activityId}`}
              className="flex items-center gap-2.5 rounded-xl border border-line-soft p-2.5 transition-colors hover:border-primary"
            >
              <div className="relative size-9 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={getActivityThumbnail(activity.thumbnailImageUrl)}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xs font-bold text-ink">{activity.title}</p>
                <p
                  className={`text-[11px] font-semibold ${ACTIVITY_STATUS_TEXT_CLASS[activity.status]}`}
                >
                  {tMyActivities(
                    `status.${activity.status.toLowerCase() as Lowercase<MyActivityStatus>}`,
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* 운영 요약 — 숫자 세 개로 오늘 상태를 먼저 잡는다 */}
      <section aria-label={t("upcomingDaysStat")} className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-line-soft px-4 py-3">
          <p className="font-display text-lg font-bold text-primary tabular-nums">
            {scheduleDatesQuery.isPending ? "—" : activityDates.size}
          </p>
          <p className="text-[11px] leading-4 text-muted">{t("upcomingDaysStat")}</p>
        </div>
        <Link
          href="/my-activities"
          className="rounded-2xl border border-line-soft px-4 py-3 transition-colors hover:border-primary"
        >
          <p className="font-display text-lg font-bold text-ink tabular-nums">
            {myActivitiesQuery.isPending ? "—" : activeActivityCount}
          </p>
          <p className="text-[11px] leading-4 text-muted">{t("activeActivitiesStat")}</p>
        </Link>
        <div className="rounded-2xl border border-line-soft px-4 py-3">
          {/* 정산 API가 아직 없다 — 자리만 잡아 두고 연동되면 값을 채운다 */}
          <p className="font-display text-lg font-bold text-muted">{t("settlementPending")}</p>
          <p className="text-[11px] leading-4 text-muted">{t("settlementStat")}</p>
        </div>
      </section>

      {/* 주간 스트립 — 한 주를 통째로 보고 화살표나 달력으로 옮겨 다닌다 */}
      <section className="flex flex-col gap-2.5">
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
              activityDates={activityDates}
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

        {scheduleDatesQuery.error ? (
          <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
            {getApiErrorMessage(scheduleDatesQuery.error, t("scheduleLoadError"))}
          </p>
        ) : null}

        <fieldset aria-label={t("scheduleDates")} className="grid grid-cols-7 gap-1 border-0 p-0">
          {weekDates.map((date) => {
            const isActive = date === activeDate;
            const isToday = date === todayDate;
            const hasActivity = activityDates.has(date);
            const weekdayLabel = isToday ? t("today") : formatDateKeyWeekday(date, locale);
            const plainLabel = `${formatDateKeyWeekday(date, locale)} ${dayNumberOf(date)}`;

            return (
              <button
                key={date}
                type="button"
                aria-pressed={isActive}
                aria-label={hasActivity ? t("dateWithActivity", { date: plainLabel }) : plainLabel}
                onClick={() => selectDate(date)}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl border py-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-line-soft text-ink hover:border-primary/50"
                }`}
              >
                <span
                  className={`text-[10px] leading-4 font-semibold ${
                    isToday ? "text-primary" : isActive ? "text-primary" : "text-muted"
                  }`}
                >
                  {weekdayLabel}
                </span>
                <span className="font-display text-sm font-bold tabular-nums">
                  {dayNumberOf(date)}
                </span>
                <span
                  aria-hidden
                  className={`size-1 rounded-full ${hasActivity ? "bg-primary" : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </fieldset>
      </section>

      {/* 선택한 날짜의 신청자 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <SectionHeading>{t("applicantsHeading")}</SectionHeading>
          <p className="font-display text-xs font-bold text-primary">
            {formatDateKeyLong(activeDate, locale)}
          </p>
        </div>
        {applicationsContent}
      </section>

      {/* 내 활동 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <SectionHeading>{t("myActivitiesHeading")}</SectionHeading>
          <div className="flex items-center gap-3">
            <Link
              href="/my-activities/create"
              className="flex h-8 items-center gap-1 rounded-full border border-primary px-3 font-display text-[11px] font-bold text-primary transition-colors hover:bg-primary-soft"
            >
              <PlusIcon className="size-3.5" />
              {t("createActivity")}
            </Link>
            <Link
              href="/my-activities"
              className="font-display text-xs font-semibold text-muted transition-colors hover:text-primary"
            >
              {t("viewAllActivities")}
            </Link>
          </div>
        </div>
        {myActivitiesContent}
      </section>
    </div>
  );
}
