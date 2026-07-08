"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { MapPinIcon, MessageSquareIcon } from "@/components/ui/icons";
import { getBuddyApplications, getBuddyScheduleDates } from "@/lib/api/buddy";
import {
  formatApplicantContact,
  formatNationalityCode,
  getActivityThumbnail,
} from "@/lib/api/buddy-view";
import type {
  BuddyDateActivityApplicationsResponse,
  BuddyScheduleDateResponse,
} from "@/types/buddy";

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
  const router = useRouter();
  const [dates, setDates] = useState<BuddyScheduleDateResponse[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [activities, setActivities] = useState<BuddyDateActivityApplicationsResponse[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(true);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [datesErrorMessage, setDatesErrorMessage] = useState("");
  const [applicationsErrorMessage, setApplicationsErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getBuddyScheduleDates().then((result) => {
      if (!isMounted) return;
      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setDatesErrorMessage(result.message);
        setIsLoadingDates(false);
        return;
      }

      setDates(result.dates);
      setIsLoadingApplications(result.dates.length > 0);
      setSelectedDate(result.dates[0]?.date ?? "");
      setIsLoadingDates(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!selectedDate) return;

    let isMounted = true;

    getBuddyApplications(selectedDate).then((result) => {
      if (!isMounted) return;
      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setApplicationsErrorMessage(result.message);
        setActivities([]);
        setIsLoadingApplications(false);
        return;
      }

      setApplicationsErrorMessage("");
      setActivities(result.activities);
      setIsLoadingApplications(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router, selectedDate]);

  function handleDateSelect(date: string) {
    if (date === selectedDate) return;
    setApplicationsErrorMessage("");
    setIsLoadingApplications(true);
    setSelectedDate(date);
  }

  let applicationsContent: ReactNode;
  if (applicationsErrorMessage) {
    applicationsContent = (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {applicationsErrorMessage}
      </p>
    );
  } else if (isLoadingApplications) {
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
        {activities.map((activity) => (
          <article
            key={activity.activityId}
            className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
          >
            <Link
              href={`/my-activities/${activity.activityId}/applicants?date=${selectedDate}`}
              className="flex items-center gap-4"
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
                  {applicantCountLabel(activity.applicantCount)}
                </span>
              </div>
            </Link>
            <ul className="ml-3 flex flex-col gap-5 border-l border-line pl-5">
              {activity.applicants.map((applicant) => (
                <li key={applicant.applicationId} className="flex items-center gap-3">
                  <Avatar
                    name={applicant.applicantName}
                    src={applicant.applicantProfileImageUrl}
                    size={40}
                  />
                  <div className="min-w-0 text-sm">
                    <p className="font-display font-semibold text-ink">{applicant.applicantName}</p>
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
          </article>
        ))}
      </div>
    );
  }

  if (isLoadingDates) {
    return <p className="py-10 text-center text-ink-soft">Loading schedule...</p>;
  }

  if (datesErrorMessage) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {datesErrorMessage}
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
            const active = date === selectedDate;

            return (
              <button
                key={date}
                type="button"
                aria-pressed={active}
                onClick={() => handleDateSelect(date)}
                className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-xl py-3 ${
                  active ? "bg-forest text-cream" : "border border-line bg-white text-ink"
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
