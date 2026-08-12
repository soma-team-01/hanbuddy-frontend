"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon } from "@/components/ui/icons";
import { formatApplicantContact, formatNationalityCode } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatSeoulDateTime } from "@/lib/datetime";
import { buddyActivityApplicationsQueryOptions, myActivityQueryOptions } from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

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
  const locale = useLocale();
  const t = useTranslations("Applicants");
  const tApplications = useTranslations("Applications");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const activityQuery = useQuery({
    ...myActivityQueryOptions(toActivityId(activityId)),
    enabled: !initialScheduleId,
  });
  const scheduleId = initialScheduleId ?? activityQuery.data?.schedules[0]?.scheduleId ?? "";
  const applicationsQuery = useQuery(buddyActivityApplicationsQueryOptions(scheduleId));
  const relevantActivityError = initialScheduleId ? null : activityQuery.error;
  useAuthQueryRedirect(relevantActivityError ?? applicationsQuery.error);

  const applications = applicationsQuery.data ?? null;
  const requestError = relevantActivityError ?? applicationsQuery.error;
  const hasNoSchedule = !initialScheduleId && activityQuery.isSuccess && !scheduleId;
  const isLoading =
    (!initialScheduleId && activityQuery.isPending) ||
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

  if (!applications) return null;

  const scheduleLabel =
    formatSeoulDateTime(applications.startAt, locale) ?? tErrors("dateTimeUnavailable");
  // 결제 대기는 아직 자리가 확정되지 않아 목록에서 뺀다
  const sections = STATUS_SECTIONS.map(({ key, statuses }) => ({
    key,
    applicants: applications.applicants.filter((applicant) =>
      (statuses as readonly string[]).includes(applicant.status),
    ),
  })).filter(({ applicants }) => applicants.length > 0);

  return (
    <>
      <div>
        <h2 className="font-display text-3xl leading-8 font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
          {applications.activityTitle}
        </h2>
        <p className="mt-2 text-muted">{scheduleLabel}</p>
      </div>

      {sections.length === 0 ? (
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
                      <Avatar
                        name={applicant.applicantName}
                        src={applicant.applicantProfileImageUrl}
                        size={48}
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-display text-lg font-semibold text-ink">
                          {applicant.applicantName}
                        </p>
                        <p className="flex items-center gap-1 text-muted">
                          <MapPinIcon className="size-3.5" />
                          {formatNationalityCode(applicant.applicantNationalityCode, locale)}
                        </p>
                        <p className="flex items-center gap-1 text-muted">
                          <MessageSquareIcon className="size-3.5" />
                          {formatApplicantContact(applicant, locale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted md:max-w-72 md:justify-end md:text-right">
                      <span>
                        {t("appliedOn", {
                          date:
                            formatSeoulDateTime(applicant.appliedAt, locale) ??
                            tErrors("dateTimeUnavailable"),
                        })}
                      </span>
                      <span>• {t("guestCount", { count: applicant.guestCount })}</span>
                    </div>
                    {applicant.specialRequest ? (
                      <p className="border-l-2 border-primary/40 pl-3 text-sm text-ink md:col-span-2">
                        {applicant.specialRequest}
                      </p>
                    ) : null}
                    {applicant.cancellationReason ? (
                      // 취소 사유 — OTHER면 남긴 상세 설명도 함께 보여준다
                      <p className="border-l-2 border-line-strong pl-3 text-sm text-muted md:col-span-2">
                        {tApplications("cancelledReason", {
                          reason: tApplications(
                            `cancellationReasons.${CANCELLATION_REASON_KEY[applicant.cancellationReason]}`,
                          ),
                        })}
                        {applicant.cancellationDetail ? (
                          <span className="mt-0.5 block text-ink">
                            {applicant.cancellationDetail}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
