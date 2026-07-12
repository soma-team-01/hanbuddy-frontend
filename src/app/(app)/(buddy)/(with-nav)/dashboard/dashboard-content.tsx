"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon } from "@/components/ui/icons";
import {
  formatApplicantContact,
  formatNationalityCode,
  getActivityThumbnail,
} from "@/lib/api/buddy-view";
import { splitStartAt } from "@/lib/format";
import {
  buddyApplicationsQueryOptions,
  buddyScheduleDatesQueryOptions,
} from "@/lib/query/buddy";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

function formatDateChip(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { day: date, label: "" };

  return {
    day: String(parsed.getDate()),
    label: new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(parsed),
  };
}

function applicantCountLabel(count: number) {
  return `${count} Applicant${count === 1 ? "" : "s"}`;
}

export function DashboardContent() {
  const [selectedDate, setSelectedDate] = useState("");
  const scheduleDatesQuery = useQuery(buddyScheduleDatesQueryOptions());
  const dates = scheduleDatesQuery.data ?? [];
  const activeDate = selectedDate || dates[0]?.date || "";
  const applicationsQuery = useQuery(buddyApplicationsQueryOptions(activeDate));
  const activities = applicationsQuery.data ?? [];
  useAuthQueryRedirect(scheduleDatesQuery.error ?? applicationsQuery.error);

  function handleDateSelect(date: string) {
    if (date === activeDate) return;
    setSelectedDate(date);
  }

  let applicationsContent: ReactNode;
  if (applicationsQuery.error) {
    applicationsContent = (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {applicationsQuery.error.message}
      </p>
    );
  } else if (applicationsQuery.isPending) {
    applicationsContent = <p className="py-8 text-center text-ink-soft">Loading applicants...</p>;
  } else if (activities.length === 0) {
    applicationsContent = (
      <p className="rounded-2xl border border-line bg-white px-4 py-8 text-center text-ink-soft">
        No applicants for this date yet.
      </p>
    );
  } else {
    applicationsContent = (
      <div className="flex flex-col gap-4">
        {activities.map((activity) => {
          const headerScheduleId = activity.schedules[0]?.activityScheduleId;
          const headerHref = headerScheduleId
            ? `/my-activities/${activity.activityId}/applicants?scheduleId=${headerScheduleId}`
            : `/my-activities/${activity.activityId}/applicants`;

          return (
            <article
              key={activity.activityId}
              className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
            >
              <Link
                href={headerHref}
                className="-m-2 flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-chip/60"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={getActivityThumbnail(activity.thumbnailImageUrl)}
                    alt={activity.activityTitle}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-display text-base font-semibold text-ink">
                    {activity.activityTitle}
                  </h3>
                  <span className="mt-1 inline-block rounded-full bg-success-soft px-2.5 py-0.5 font-display text-xs font-semibold text-success">
                    {applicantCountLabel(activity.totalApplicantCount)}
                  </span>
                </div>
              </Link>
              {activity.schedules.map((schedule) => (
                <section key={schedule.activityScheduleId} className="flex flex-col gap-4">
                  <Link
                    href={`/my-activities/${activity.activityId}/applicants?scheduleId=${schedule.activityScheduleId}`}
                    className="flex items-center justify-between rounded-xl bg-chip/60 px-3 py-2 transition-colors hover:bg-chip"
                  >
                    <span className="font-display text-sm font-semibold text-ink">
                      {splitStartAt(schedule.startAt).time}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {applicantCountLabel(schedule.applicantCount)}
                    </span>
                  </Link>
                  {schedule.applicants.length > 0 ? (
                    <ul className="ml-3 flex flex-col gap-5 border-l border-line pl-5">
                      {schedule.applicants.map((applicant) => (
                        <li key={applicant.applicationId} className="flex items-center gap-3">
                          <Avatar
                            name={applicant.applicantName}
                            src={applicant.applicantProfileImageUrl}
                            size={40}
                          />
                          <div className="min-w-0 text-sm">
                            <p className="font-display font-semibold text-ink">
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

  if (scheduleDatesQuery.isPending) {
    return <p className="py-10 text-center text-ink-soft">Loading schedule...</p>;
  }

  if (scheduleDatesQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {scheduleDatesQuery.error.message}
      </p>
    );
  }

  if (dates.length === 0) {
    return <p className="py-10 text-center text-ink-soft">No upcoming schedules yet.</p>;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold text-forest">Upcoming</h2>
      <div className="rounded-2xl bg-chip p-3">
        <div className="flex scrollbar-none gap-3 overflow-x-auto">
          {dates.map(({ date }) => {
            const chip = formatDateChip(date);
            const active = date === activeDate;

            return (
              <button
                key={date}
                type="button"
                aria-pressed={active}
                onClick={() => handleDateSelect(date)}
                className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-3 transition-colors ${
                  active
                    ? "bg-forest text-cream"
                    : "border border-line bg-white text-ink hover:border-line-strong hover:bg-chip"
                }`}
              >
                <span className="font-display text-lg font-bold">{chip.day}</span>
                <span className={`text-xs ${active ? "text-sage" : "text-ink-soft"}`}>
                  {chip.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {applicationsContent}
    </section>
  );
}
