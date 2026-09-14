"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { ApplicantProfileDialog } from "@/components/buddy/ApplicantProfileDialog";
import { MonthCalendarButton } from "@/components/buddy/MonthCalendarButton";
import { Avatar } from "@/components/ui/Avatar";
import { ChatBubbleDotsIcon, MapPinIcon, UsersIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";
import { formatNationalityCode } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { formatSeoulDateTime, getSeoulDateTimeParts, getSeoulNowParts } from "@/lib/datetime";
import { buddyActivityApplicationsQueryOptions, myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { BuddyApplicationApplicantDetailResponse } from "@/types/buddy";

interface ApplicantsContentProps {
  activityId: string;
  initialScheduleId?: string;
}

function toActivityId(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value;
}

/**
 * 상태별 영역. 결제 대기는 아직 확정된 자리가 아니라 버디에게 보여주지 않고,
 * 새 신청으로 대체된 신청(SUPERSEDED)은 취소와 같이 묶는다.
 */
const STATUS_SECTIONS = [
  { key: "sectionCompleted", statuses: ["COMPLETED"] },
  { key: "sectionConfirmed", statuses: ["CONFIRMED"] },
  { key: "sectionCancelled", statuses: ["CANCELLED", "SUPERSEDED"] },
] as const;

const CANCELLATION_REASON_KEY = {
  SCHEDULE_CONFLICT: "scheduleConflict",
  ILLNESS: "illness",
  FOUND_OTHER: "foundOther",
  OTHER: "other",
} as const;

export function ApplicantsContent({
  activityId,
  initialScheduleId,
}: Readonly<ApplicantsContentProps>) {
  const locale = useLocale() as Locale;
  const language = getContentLanguage(locale);
  const t = useTranslations("Applicants");
  const tApplications = useTranslations("Applications");
  const tChat = useTranslations("Chat");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const todayDate = getSeoulNowParts().date;
  // 달력에서 고른 날짜. 비어 있으면 초기 회차(쿼리 파라미터 또는 첫 회차)를 따른다
  const [selectedDate, setSelectedDate] = useState("");
  const [profileApplicant, setProfileApplicant] =
    useState<BuddyApplicationApplicantDetailResponse | null>(null);

  // 이 활동의 회차 날짜로 달력 점을 찍기 위해 상세는 항상 불러온다
  const activityQuery = useQuery(myActivityQueryOptions(toActivityId(activityId)));
  const schedules = activityQuery.data?.schedules ?? [];
  const scheduleDateOf = (startAt: string) => getSeoulDateTimeParts(startAt)?.date ?? "";
  const activityDates = new Set(
    schedules.map(({ startAt }) => scheduleDateOf(startAt)).filter((date) => date.length > 0),
  );

  // 날짜를 골랐으면 그 날짜의 첫 회차, 아니면 쿼리 파라미터의 회차, 그마저 없으면 첫 회차
  const dateSchedule = selectedDate
    ? schedules.find(({ startAt }) => scheduleDateOf(startAt) === selectedDate)
    : undefined;
  const fallbackScheduleId = initialScheduleId ?? schedules[0]?.scheduleId ?? "";
  const scheduleId = selectedDate ? (dateSchedule?.scheduleId ?? "") : fallbackScheduleId;
  const noScheduleOnSelectedDate = Boolean(selectedDate) && !dateSchedule;

  const applicationsQuery = useQuery(buddyActivityApplicationsQueryOptions(scheduleId, language));
  // 쿼리 파라미터로 바로 들어온 첫 화면에서는 활동 상세 오류가 조회를 막지 않는다
  const relevantActivityError = initialScheduleId && !selectedDate ? null : activityQuery.error;
  useAuthQueryRedirect(relevantActivityError ?? applicationsQuery.error);

  const applications = applicationsQuery.data ?? null;
  const requestError = relevantActivityError ?? applicationsQuery.error;
  const hasNoSchedule =
    !initialScheduleId && activityQuery.isSuccess && !scheduleId && !selectedDate;
  const isLoading =
    (!initialScheduleId && activityQuery.isPending) ||
    // 날짜를 골랐는데 회차 목록이 아직이면 "일정 없음"으로 잘못 판정하지 않게 기다린다
    (Boolean(selectedDate) && activityQuery.isPending) ||
    (Boolean(scheduleId) && applicationsQuery.isPending);

  if (isLoading) {
    return <p className="py-10 text-center text-muted">{t("loading")}</p>;
  }

  if (requestError || hasNoSchedule) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {requestError ? getApiErrorMessage(requestError, t("loadError")) : t("noSchedule")}
      </p>
    );
  }

  if (!applications && !noScheduleOnSelectedDate) return null;

  const scheduleLabel = noScheduleOnSelectedDate
    ? null
    : (formatSeoulDateTime(applications?.startAt ?? "", locale) ?? tErrors("dateTimeUnavailable"));
  const calendarSelectedDate =
    selectedDate || (applications ? scheduleDateOf(applications.startAt) : "") || todayDate;
  // 결제 대기는 아직 자리가 확정되지 않아 목록에서 뺀다
  const sections = STATUS_SECTIONS.map(({ key, statuses }) => ({
    key,
    applicants: (applications?.applicants ?? []).filter((applicant) =>
      (statuses as readonly string[]).includes(applicant.status),
    ),
  })).filter(({ applicants }) => applicants.length > 0);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl leading-8 font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
            {activityQuery.data?.title ?? applications?.activityTitle}
          </h2>
          {scheduleLabel ? <p className="mt-2 text-muted">{scheduleLabel}</p> : null}
        </div>
        {/* 이 활동의 다른 회차 날짜로 바로 이동한다 — 점은 이 활동의 회차 날짜 */}
        <MonthCalendarButton
          locale={locale}
          selectedDate={calendarSelectedDate}
          todayDate={todayDate}
          fixedActivityDates={activityDates}
          onSelectDate={setSelectedDate}
        />
      </div>

      {noScheduleOnSelectedDate ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-soft px-4 py-8 text-center text-muted">
          {t("noScheduleOnDate")}
        </p>
      ) : sections.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line-soft px-4 py-8 text-center text-muted">
          {t("empty")}
        </p>
      ) : (
        <div data-testid="applicant-records" className="mt-6 flex flex-col gap-8">
          {sections.map(({ key, applicants }) => (
            <section key={key} className="flex flex-col gap-3">
              <div className="flex items-baseline gap-2">
                <h3 className="font-display text-lg font-bold text-primary">{t(key)}</h3>
                <span className="font-display text-sm font-semibold text-muted tabular-nums">
                  {t("guestApplicantCount", { count: applicants.length })}
                </span>
              </div>
              <div className="overflow-hidden rounded-3xl border border-line-soft md:divide-y md:divide-line-soft">
                {applicants.map((applicant) => (
                  <article
                    key={applicant.applicationId}
                    className="flex flex-col gap-4 border-b border-line-soft p-4 last:border-b-0 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:border-b-0 md:p-5"
                  >
                    <div className="flex items-center gap-4">
                      {/* 이름·사진을 누르면 연락처가 담긴 프로필이 뜬다 */}
                      <button
                        type="button"
                        onClick={() => setProfileApplicant(applicant)}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left transition-opacity hover:opacity-80"
                      >
                        <Avatar
                          name={applicant.applicantName}
                          src={applicant.applicantProfileImageUrl}
                          size={48}
                        />
                        <span className="min-w-0 text-sm">
                          <span className="block font-display text-lg font-semibold text-ink">
                            {applicant.applicantName}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted">
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="size-3.5" />
                              {formatNationalityCode(applicant.applicantNationalityCode, locale)}
                            </span>
                            <span className="flex items-center gap-1">
                              <UsersIcon className="size-3.5" />
                              {t("guestCount", { count: applicant.guestCount })}
                            </span>
                          </span>
                        </span>
                      </button>
                      {applicant.cancellationReason ? (
                        // 취소 사유는 채팅 아이콘 바로 왼쪽에서 읽힌다. OTHER면 남긴 상세도 함께
                        <span className="min-w-0 text-right text-xs text-muted">
                          {tApplications("cancelledReason", {
                            reason: tApplications(
                              `cancellationReasons.${CANCELLATION_REASON_KEY[applicant.cancellationReason]}`,
                            ),
                          })}
                          {applicant.cancellationDetail ? (
                            <span className="block text-ink">{applicant.cancellationDetail}</span>
                          ) : null}
                        </span>
                      ) : null}
                      <StartChatButton
                        target={{ kind: "direct", targetUserId: applicant.applicantUserId }}
                        label={tChat("messageApplicant", { name: applicant.applicantName })}
                        icon={<ChatBubbleDotsIcon className="size-4" />}
                        labelHidden
                        className="flex size-9 shrink-0 items-center justify-center text-muted transition-colors enabled:hover:text-primary disabled:opacity-60"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted md:max-w-72 md:justify-end md:text-right">
                      <span>
                        {t("appliedOn", {
                          date:
                            formatSeoulDateTime(applicant.appliedAt, locale) ??
                            tErrors("dateTimeUnavailable"),
                        })}
                      </span>
                    </div>
                    {applicant.specialRequest ? (
                      // 이름 시작 위치(아바타 48 + 간격 16)에 맞춰 라벨과 함께 적는다
                      <p className="ml-16 text-sm text-ink md:col-span-2">
                        <span className="font-semibold text-primary">{t("guestNoteLabel")} </span>
                        {applicant.specialRequest}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {profileApplicant ? (
        <ApplicantProfileDialog
          applicant={profileApplicant}
          locale={locale}
          onClose={() => setProfileApplicant(null)}
        />
      ) : null}
    </>
  );
}
