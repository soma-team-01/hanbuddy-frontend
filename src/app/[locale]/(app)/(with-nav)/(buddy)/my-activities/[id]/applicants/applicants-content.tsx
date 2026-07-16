"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon } from "@/components/ui/icons";
import { formatApplicantContact, formatNationalityCode } from "@/lib/api/buddy-view";
import { formatSeoulDateTime, getSeoulDateTimeParts } from "@/lib/datetime";
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

function formatApplicationStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ApplicantsContent({
  activityId,
  initialScheduleId,
}: Readonly<ApplicantsContentProps>) {
  const locale = useLocale();
  const tErrors = useTranslations("Errors");
  const activityQuery = useQuery({
    ...myActivityQueryOptions(toActivityId(activityId)),
    enabled: !initialScheduleId,
  });
  const scheduleId = initialScheduleId ?? activityQuery.data?.schedules[0]?.scheduleId ?? "";
  const applicationsQuery = useQuery(buddyActivityApplicationsQueryOptions(scheduleId));
  const relevantActivityError = initialScheduleId ? null : activityQuery.error;
  useAuthQueryRedirect(relevantActivityError ?? applicationsQuery.error);

  const applications = applicationsQuery.data ?? null;
  const errorMessage =
    relevantActivityError?.message ||
    applicationsQuery.error?.message ||
    (!initialScheduleId && activityQuery.isSuccess && !scheduleId ? "등록된 일정이 없습니다." : "");
  const isLoading =
    (!initialScheduleId && activityQuery.isPending) ||
    (Boolean(scheduleId) && applicationsQuery.isPending);

  if (isLoading) {
    return <p className="py-10 text-center text-ink-soft">Loading applicants...</p>;
  }

  if (errorMessage) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {errorMessage}
      </p>
    );
  }

  if (!applications) return null;

  const confirmedCount =
    applications.statusCounts.CONFIRMED ??
    applications.applicants.filter((applicant) => applicant.status === "CONFIRMED").length;
  const schedule = getSeoulDateTimeParts(applications.startAt);
  const scheduleLabel = schedule
    ? `${schedule.date} ${schedule.time}`
    : tErrors("dateTimeUnavailable");

  return (
    <>
      <div>
        <h1 className="font-display text-2xl leading-8 font-semibold text-forest">
          {applications.activityTitle}
        </h1>
        <p className="mt-2 text-ink-soft">
          {scheduleLabel} • {confirmedCount} confirmed
        </p>
      </div>

      {applications.applicants.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-ink-soft">
          No applicants for this schedule yet.
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
                    {formatNationalityCode(applicant.applicantNationalityCode)}
                  </p>
                  <p className="flex items-center gap-1 text-ink-soft">
                    <MessageSquareIcon className="size-3.5" />
                    {formatApplicantContact(applicant)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-soft">
                <span>
                  Applied for:{" "}
                  {formatSeoulDateTime(applicant.appliedAt, locale) ??
                    tErrors("dateTimeUnavailable")}
                </span>
                <span>
                  • {applicant.guestCount} guest{applicant.guestCount === 1 ? "" : "s"}
                </span>
                <span>• {formatApplicationStatus(applicant.status)}</span>
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
