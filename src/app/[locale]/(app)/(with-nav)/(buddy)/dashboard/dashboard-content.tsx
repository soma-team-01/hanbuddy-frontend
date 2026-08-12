"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useState } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApplicantProfileDialog } from "./applicant-profile-dialog";
import { Avatar } from "@/components/ui/Avatar";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChatBubbleDotsIcon,
  ChevronDownIcon,
  MapPinIcon,
  MessageSquareIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
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
import { deleteMyActivity } from "@/lib/api/buddy";
import {
  buddyApplicationsQueryOptions,
  buddyKeys,
  buddyScheduleDatesQueryOptions,
  myActivitiesQueryOptions,
} from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { myChatRoomsQueryOptions } from "@/lib/query/chat";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { BuddyApplicationApplicantSummaryResponse, MyActivityStatus } from "@/types/buddy";
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
  const queryClient = useQueryClient();

  const todayDate = getSeoulNowParts().date;
  const [selectedDate, setSelectedDate] = useState("");
  // 주간 스트립이 보여주는 주. 화살표로만 움직이고 날짜 선택과는 분리되어 있다
  const [weekAnchor, setWeekAnchor] = useState("");
  // 요청 사항을 펼쳐 둔 신청 ID 목록
  const [expandedRequestIds, setExpandedRequestIds] = useState<ReadonlySet<number>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [profileApplicant, setProfileApplicant] =
    useState<BuddyApplicationApplicantSummaryResponse | null>(null);

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

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: number) =>
      unwrapApiResult(await deleteMyActivity(activityId), "message"),
    // 활동이 사라지면 일정·신청자 목록도 함께 달라진다
    onSettled: () => queryClient.invalidateQueries({ queryKey: buddyKeys.all() }),
  });

  useAuthQueryRedirect(
    scheduleDatesQuery.error ?? applicationsQuery.error ?? myActivitiesQuery.error,
  );

  function toggleRequest(applicationId: number) {
    setExpandedRequestIds((current) => {
      const next = new Set(current);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  }

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
                      // 이미 열린 방인지에 따라 문구와 안내를 나눈다 — 만들기 전엔 무엇이 생기는지,
                      // 만든 뒤엔 누르면 들어간다는 걸 분명히 한다
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
                          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-primary px-2.5 font-display text-[11px] font-bold text-primary transition-colors enabled:hover:bg-primary-soft disabled:opacity-60"
                        />
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute right-0 bottom-full z-40 mb-2 hidden w-64 rounded-xl border border-primary/30 bg-canvas-soft p-3 text-left text-xs leading-5 text-muted shadow-[0_12px_30px_rgba(61,45,43,0.14)] group-focus-within:block group-hover:block"
                        >
                          {groupRoomScheduleIds.has(schedule.activityScheduleId)
                            ? tChat("autoJoinNoticeOpen")
                            : tChat("autoJoinNoticeCreate")}
                        </span>
                      </span>
                    ) : null}
                  </div>

                  {schedule.applicants.length > 0 ? (
                    <ul className="ml-2 flex flex-col gap-3 border-l border-line-soft pl-4">
                      {schedule.applicants.map((applicant) => {
                        const hasRequest = Boolean(applicant.specialRequest?.trim());
                        const requestOpen = expandedRequestIds.has(applicant.applicationId);

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
                                      <MessageSquareIcon className="size-3" />
                                      {formatApplicantContact(applicant, locale)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <UsersIcon className="size-3" />
                                      {t("profileGuests", { count: applicant.guestCount })}
                                    </span>
                                  </span>
                                </span>
                              </button>
                              {hasRequest ? (
                                // 요청 사항이 있는 사람만 펼침 버튼이 생긴다
                                <button
                                  type="button"
                                  aria-expanded={requestOpen}
                                  aria-label={t("specialRequestToggle", {
                                    name: applicant.applicantName,
                                  })}
                                  onClick={() => toggleRequest(applicant.applicationId)}
                                  className={`flex size-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    requestOpen ? "text-primary" : "text-muted hover:text-primary"
                                  }`}
                                >
                                  <ChevronDownIcon
                                    className={`size-4 transition-transform ${requestOpen ? "rotate-180" : ""}`}
                                  />
                                </button>
                              ) : null}
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
                            {hasRequest && requestOpen ? (
                              // 계단식 — 이름 아래로 들여쓰인 블록이 펼쳐진다
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
          <li
            key={activity.activityId}
            className="flex items-center gap-1 rounded-xl border border-line-soft p-2.5 transition-colors hover:border-primary"
          >
            <Link
              href={`/my-activities/${activity.activityId}`}
              className="flex min-w-0 flex-1 items-center gap-2.5"
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
            {/* 홈에서 바로 고치고 지운다 — 내 활동 화면과 같은 흐름 */}
            <Link
              href={`/my-activities/${activity.activityId}/edit`}
              aria-label={tMyActivities("editActivity", { title: activity.title })}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-primary"
            >
              <PencilIcon className="size-3.5" />
            </Link>
            <button
              type="button"
              aria-label={tMyActivities("deleteActivity", { title: activity.title })}
              disabled={deleteActivityMutation.isPending}
              onClick={() => setDeleteTargetId(activity.activityId)}
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors enabled:hover:text-danger disabled:opacity-50"
            >
              <TrashIcon className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* 정산 예정 금액 — API가 아직 없어 자리만 잡아 두고 연동되면 금액을 오렌지로 채운다 */}
      <section className="flex items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-2.5">
        <p className="font-display text-xs font-bold text-ink">{t("settlementStat")}</p>
        <p className="text-xs font-semibold text-muted">{t("settlementPending")}</p>
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
              className="flex h-8 items-center gap-1 rounded-lg bg-primary px-3 font-display text-[11px] font-bold text-on-primary transition-colors hover:bg-primary-hover"
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
        {deleteActivityMutation.error ? (
          <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
            {getApiErrorMessage(deleteActivityMutation.error, tMyActivities("deleteError"))}
          </p>
        ) : null}
        {myActivitiesContent}
      </section>

      {profileApplicant ? (
        <ApplicantProfileDialog
          applicant={profileApplicant}
          locale={locale}
          onClose={() => setProfileApplicant(null)}
        />
      ) : null}

      {deleteTargetId !== null ? (
        <ConfirmDialog
          title={tMyActivities("deleteTitle")}
          description={tMyActivities("deleteDescription")}
          confirmLabel={tMyActivities("delete")}
          tone="danger"
          onConfirm={() => {
            const activityId = deleteTargetId;
            setDeleteTargetId(null);
            deleteActivityMutation.mutate(activityId);
          }}
          onClose={() => setDeleteTargetId(null)}
        />
      ) : null}
    </div>
  );
}
