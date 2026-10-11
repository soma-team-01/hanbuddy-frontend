"use client";
import { PendingReservationInbox } from "@/components/buddy/PendingReservationInbox";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ScheduleActions } from "@/components/buddy/ScheduleActions";
import { ApplicantProfileDialog } from "@/components/buddy/ApplicantProfileDialog";
import { Avatar } from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChatBubbleDotsIcon,
  MapPinIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { formatNationalityCode, getActivityThumbnail } from "@/lib/api/buddy-view";
import type { Locale } from "@/i18n/routing";
import { formatSeoulTime, getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import {
  buddyApplicationsQueryOptions,
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

/** 섹션 머리글 */
function SectionHeading({ children }: Readonly<{ children: ReactNode }>) {
  return <h2 className="font-display text-lg font-bold text-primary">{children}</h2>;
}

export function DashboardContent() {
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const t = useTranslations("BuddyDashboard");
  const tChat = useTranslations("Chat");
  const getApiErrorMessage = useApiErrorMessage();

  const todayDate = getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState("");
  // 주간 스트립이 보여주는 주. 화살표로만 움직이고 날짜 선택과는 분리되어 있다
  const [weekAnchor, setWeekAnchor] = useState("");
  const [profileApplicant, setProfileApplicant] =
    useState<BuddyApplicationApplicantSummaryResponse | null>(null);

  // 기본 창(오늘~15일) — 처음 보여줄 날짜를 고르는 데 쓴다
  const scheduleDatesQuery = useQuery(buddyScheduleDatesQueryOptions());
  const myActivitiesQuery = useQuery(myActivitiesQueryOptions());
  // 단체 채팅방이 이미 있는 회차 — 버튼 문구를 만들기/열기로 나눈다
  const chatRoomsQuery = useQuery(myChatRoomsCacheQueryOptions(language));
  const groupRooms = new Map(
    (chatRoomsQuery.data ?? [])
      .filter((room) => room.activityScheduleId !== null)
      .map((room) => [room.activityScheduleId, room]),
  );

  const scheduleDates = (scheduleDatesQuery.data ?? [])
    .map(({ dateStartAt, hasActivity }) => ({
      date: getSeoulDateTimeParts(dateStartAt)?.date ?? "",
      hasActivity,
    }))
    .filter(({ date }) => date.length > 0);

  // 아직 고르지 않았으면 활동이 있는 첫 날짜, 없으면 오늘
  const defaultDate = scheduleDates.find(({ hasActivity }) => hasActivity)?.date ?? todayDate;
  const activeDate = selectedDate || defaultDate;
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
  // Approval requests live in the date-independent inbox, never in calendar applicant rows.
  const activities = (applicationsQuery.data ?? [])
    .map((activity) => {
      const schedules = activity.schedules.flatMap((schedule) => {
        const applicants = schedule.applicants.filter(
          (applicant) =>
            !applicant.status ||
            applicant.status === "CONFIRMED" ||
            applicant.status === "COMPLETED",
        );
        if (schedule.applicants.length > 0 && applicants.length === 0) return [];
        return [
          {
            ...schedule,
            applicants,
            applicantCount: applicants.reduce((sum, item) => sum + item.guestCount, 0),
          },
        ];
      });
      return {
        ...activity,
        schedules,
        totalApplicantCount: schedules.reduce((sum, item) => sum + item.applicantCount, 0),
      };
    })
    .filter((activity) => activity.schedules.length > 0);

  useAuthQueryRedirect(
    scheduleDatesQuery.error ??
      weekDatesQuery.error ??
      applicationsQuery.error ??
      myActivitiesQuery.error,
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
          // Multiple sessions keep their own menu so cancelling one is never ambiguous.
          const menuInHeader = activity.schedules.length === 1;
          const headerHref = headerScheduleId
            ? `/my-activities/${activity.activityId}/applicants?scheduleId=${headerScheduleId}`
            : `/my-activities/${activity.activityId}/applicants`;

          return (
            <article
              key={activity.activityId}
              className="group/schedule-card relative flex flex-col gap-3 rounded-2xl border border-line-soft p-4 has-[[data-schedule-cancelled=true]]:not-has-[[data-schedule-cancelled=false]]:bg-ink/5"
            >
              <Link
                href={headerHref}
                className={`-m-1 flex min-w-0 items-center gap-3 rounded-lg p-1 transition-colors hover:text-primary ${menuInHeader ? "pr-10 group-has-[[data-schedule-cancelled=true]]/schedule-card:pr-36" : ""}`}
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
                    <ScheduleActions
                      referral={
                        myActivitiesQuery.data?.find(
                          (item) => item.activityId === activity.activityId,
                        )?.activityType === "REFERRAL"
                      }
                      menuPlacement={menuInHeader ? "card-header" : "inline"}
                      scheduleId={schedule.activityScheduleId}
                      startAt={schedule.startAt}
                      applicantCount={schedule.applicants
                        .filter(
                          (applicant) =>
                            !applicant.status ||
                            applicant.status === "CONFIRMED" ||
                            applicant.status === "COMPLETED",
                        )
                        .reduce((count, applicant) => count + applicant.guestCount, 0)}
                      roomId={groupRooms.get(schedule.activityScheduleId)?.chatRoomId}
                      knownCancelled={
                        groupRooms.get(schedule.activityScheduleId)?.activityScheduleCancelled
                      }
                    />
                  </div>

                  {schedule.applicants.length > 0 ? (
                    <ul className="ml-2 flex flex-col gap-3 border-l border-line-soft pl-4">
                      {schedule.applicants.map((applicant) => {
                        const hasRequest = Boolean(applicant.specialRequest?.trim());

                        return (
                          <li key={applicant.applicationId} className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2.5">
                              {/* 이름을 누르면 신청자 프로필이 뜬다 */}
                              <button
                                type="button"
                                onClick={() => setProfileApplicant(applicant)}
                                className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-80"
                              >
                                <Avatar
                                  name={applicant.applicantName}
                                  src={applicant.applicantProfileImageUrl}
                                  size={32}
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-display text-xs font-semibold text-ink">
                                    {applicant.applicantName}
                                  </span>
                                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted">
                                    <span className="flex items-center gap-1">
                                      <MapPinIcon className="size-3" />
                                      {formatNationalityCode(
                                        applicant.applicantNationalityCode,
                                        locale,
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <UsersIcon className="size-3" />
                                      {t("profileGuests", { count: applicant.guestCount })}
                                    </span>
                                  </span>
                                </span>
                              </button>
                              <StartChatButton
                                target={{
                                  kind: "direct",
                                  targetUserId: applicant.applicantUserId,
                                }}
                                label={tChat("messageApplicant", {
                                  name: applicant.applicantName,
                                })}
                                icon={<ChatBubbleDotsIcon className="size-4" />}
                                labelHidden
                                className="flex size-8 shrink-0 items-center justify-center text-muted transition-colors enabled:hover:text-primary disabled:opacity-60"
                              />
                            </div>
                            {hasRequest ? (
                              // 요청 사항은 놓치면 안 되는 정보라 접지 않고 바로 보여준다
                              <div className="ml-10 border-l-2 border-primary/40 pl-3">
                                <p className="text-[10px] font-bold tracking-[0.1em] text-primary uppercase">
                                  {t("specialRequestLabel")}
                                </p>
                                <p className="mt-0.5 text-xs leading-5 whitespace-pre-line text-ink">
                                  {applicant.specialRequest}
                                </p>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
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

  return (
    <div className="flex flex-col gap-7">
      {/* 신청자 — 주간 스트립과 선택한 날짜의 신청자 목록을 한 섹션으로 묶는다 */}
      <section className="flex flex-col gap-2.5">
        <SectionHeading>{t("applicantsHeading")}</SectionHeading>

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
                aria-label={hasActivity ? t("dateWithActivity", { date: plainLabel }) : plainLabel}
                onClick={() => selectDate(date)}
                className={`flex min-w-0 flex-col items-center gap-0.5 rounded-xl border py-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line-soft text-ink hover:border-primary/50"
                }`}
              >
                <span
                  className={`text-[10px] leading-4 font-semibold ${
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

        <div className="mt-1.5">{applicationsContent}</div>
      </section>

      <PendingReservationInbox />

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
