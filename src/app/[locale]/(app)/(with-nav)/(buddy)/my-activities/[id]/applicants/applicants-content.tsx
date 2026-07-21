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

const STATUS_MESSAGE_KEY = {
  PENDING_PAYMENT: "pendingPayment",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export function ApplicantsContent({
  activityId,
  initialScheduleId,
}: Readonly<ApplicantsContentProps>) {
  const locale = useLocale();
  const t = useTranslations("Applicants");
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
    return <p className="py-10 text-center text-ink-soft">{t("loading")}</p>;
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

  const confirmedCount =
    applications.statusCounts.CONFIRMED ??
    applications.applicants.filter((applicant) => applicant.status === "CONFIRMED").length;
  const pendingCount =
    applications.statusCounts.PENDING_PAYMENT ??
    applications.applicants.filter((applicant) => applicant.status === "PENDING_PAYMENT").length;
  const scheduleLabel =
    formatSeoulDateTime(applications.startAt, locale) ?? tErrors("dateTimeUnavailable");

  return (
    <>
      <div>
        <h1 className="font-display text-2xl leading-8 font-semibold text-forest">
          {applications.activityTitle}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-1 text-ink-soft">
          <span>{scheduleLabel}</span>
          <span aria-hidden>•</span>
          <span>{t("confirmedCount", { count: confirmedCount })}</span>
          <span aria-hidden>•</span>
          <span>{t("pendingCount", { count: pendingCount })}</span>
        </p>
      </div>

      {applications.applicants.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-ink-soft">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {applications.applicants.map((applicant) => (
            <article
              key={applicant.applicationId}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
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
                  <p className="flex items-center gap-1 text-ink-soft">
                    <MapPinIcon className="size-3.5" />
                    {formatNationalityCode(applicant.applicantNationalityCode, locale)}
                  </p>
                  <p className="flex items-center gap-1 text-ink-soft">
                    <MessageSquareIcon className="size-3.5" />
                    {formatApplicantContact(applicant, locale)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
                <span>
                  {t("appliedOn", {
                    date:
                      formatSeoulDateTime(applicant.appliedAt, locale) ??
                      tErrors("dateTimeUnavailable"),
                  })}
                </span>
                <span>• {t("guestCount", { count: applicant.guestCount })}</span>
                <span>• {t(`status.${STATUS_MESSAGE_KEY[applicant.status]}`)}</span>
              </div>
              {applicant.specialRequest ? (
                <p className="rounded-xl bg-sand p-4 text-sm text-ink">
                  {applicant.specialRequest}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
