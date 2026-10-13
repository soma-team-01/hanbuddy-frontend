"use client";

import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";
import { getContentLanguage } from "@/lib/content-language";
import { formatSeoulTime } from "@/lib/datetime";
import {
  createDashboardRequestQueue,
  dashboardSessionQueryOptions,
} from "@/lib/query/buddy-dashboard";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { isUnauthenticatedError } from "@/lib/api/errors";
import { isDeclinedApplicationStatus } from "@/lib/application-approval";
import type {
  BuddyActivityApplicationsResponse,
  BuddyApplicationApplicantSummaryResponse,
  BuddyDateActivityApplicationsResponse,
  BuddyDateScheduleApplicationsResponse,
  MyActivitySummaryResponse,
} from "@/types/buddy";
import { DashboardSessionDetail } from "./DashboardSessionDetail";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

type Props = Readonly<{
  activities: BuddyDateActivityApplicationsResponse[];
  rooms: readonly {
    activityScheduleId: number | null;
    chatRoomId: number;
    activityScheduleCancelled?: boolean;
  }[];
  myActivities: MyActivitySummaryResponse[];
  onOpenProfile: (applicant: BuddyApplicationApplicantSummaryResponse) => void;
  onDetailChange?: (open: boolean) => void;
}>;
type SessionQuery = UseQueryResult<BuddyActivityApplicationsResponse, Error>;

function participants(data?: BuddyActivityApplicationsResponse) {
  return data?.applicants.filter(
    (item) => item.status === "CONFIRMED" || item.status === "COMPLETED",
  );
}
function cancellations(data?: BuddyActivityApplicationsResponse) {
  // Payment holds and superseded attempts are not guest cancellations.
  return data?.applicants.filter((item) => item.status === "CANCELLED");
}
function pendingApprovals(applicants: BuddyApplicationApplicantSummaryResponse[]) {
  return applicants.filter((item) => item.status === "PENDING_APPROVAL");
}
function guestCount(applicants: BuddyApplicationApplicantSummaryResponse[]) {
  return applicants.reduce((total, item) => total + item.guestCount, 0);
}

function activeParticipants(schedule: BuddyDateScheduleApplicationsResponse, query: SessionQuery) {
  return (
    participants(query.data) ??
    schedule.applicants.filter(
      (item) => !item.status || item.status === "CONFIRMED" || item.status === "COMPLETED",
    )
  );
}

export function DashboardApplicationsList({
  activities,
  rooms,
  myActivities,
  onOpenProfile,
  onDetailChange,
}: Props) {
  const locale = useLocale() as Locale;
  const t = useTranslations("BuddyDashboard");
  const statusLabel = useTranslations("Status");
  const approval = useTranslations("Approval");
  const run = useMemo(() => createDashboardRequestQueue(), []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<number, HTMLButtonElement>());
  const detailId = useId();
  const ids = [
    ...new Set(
      activities.flatMap((activity) =>
        activity.schedules.map((schedule) => schedule.activityScheduleId),
      ),
    ),
  ];
  const queries = useQueries({
    queries: ids.map((id) => dashboardSessionQueryOptions(id, getContentLanguage(locale), run)),
  });
  useAuthQueryRedirect(queries.find((query) => isUnauthenticatedError(query.error))?.error ?? null);
  const records = new Map(ids.map((id, index) => [id, queries[index]]));
  const sessions = activities
    .flatMap((activity) =>
      activity.schedules
        .filter((schedule) => {
          const query = records.get(schedule.activityScheduleId)!;
          if (query.isError) return true; // Unknown is never treated as empty.
          if (!query.data)
            return schedule.applicantCount > 0 || pendingApprovals(schedule.applicants).length > 0;
          return Boolean(
            participants(query.data)?.length ||
            pendingApprovals(query.data.applicants).length ||
            cancellations(query.data)?.length ||
            query.data.applicants.some((item) => isDeclinedApplicationStatus(item.status)),
          );
        })
        .map((schedule) => ({
          activity,
          schedule,
          query: records.get(schedule.activityScheduleId)!,
        })),
    )
    .sort(
      (a, b) =>
        Date.parse(a.schedule.startAt) - Date.parse(b.schedule.startAt) ||
        a.schedule.activityScheduleId - b.schedule.activityScheduleId,
    );
  const selected = sessions.find(({ schedule }) => schedule.activityScheduleId === selectedId);
  const loading = queries.some((query) => query.isPending);
  const showingDetail = detailOpen && Boolean(selected);
  useEffect(() => {
    onDetailChange?.(showingDetail);
    if (showingDetail) {
      backRef.current?.focus();
    }
  }, [showingDetail, onDetailChange]);

  function openSession(id: number) {
    setSelectedId(id);
    setDetailOpen(true);
  }

  function returnToList() {
    setDetailOpen(false);
    // Wait for the list to become visible before restoring keyboard focus.
    requestAnimationFrame(() => {
      if (selected) rowRefs.current.get(selected.schedule.activityScheduleId)?.focus();
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-3" data-detail-open={showingDetail}>
      {loading ? (
        <p role="status" className="text-xs text-muted">
          {t("loadingRecords")}
        </p>
      ) : null}
      {!loading && !sessions.length ? (
        <p className="px-4 py-6 text-center text-sm text-muted">{t("noSessionRecords")}</p>
      ) : null}
      {sessions.length > 0 ? (
        <div className="min-w-0">
          <section aria-label={t("sessions")} className="min-w-0" hidden={showingDetail}>
            <p className="mb-2 text-xs text-muted">
              {t("sessionCount", { count: sessions.length })}
            </p>
            <ul className="divide-y divide-line-soft">
              {sessions.map(({ activity, schedule, query }) => {
                const active = activeParticipants(schedule, query);
                const cancelled = cancellations(query.data);
                const pending = pendingApprovals(query.data?.applicants ?? schedule.applicants);
                const isSelected = showingDetail && schedule.activityScheduleId === selectedId;
                return (
                  <li key={schedule.activityScheduleId}>
                    <button
                      type="button"
                      ref={(node) => {
                        if (node) rowRefs.current.set(schedule.activityScheduleId, node);
                        else rowRefs.current.delete(schedule.activityScheduleId);
                      }}
                      aria-pressed={isSelected}
                      aria-controls={detailId}
                      onClick={() => openSession(schedule.activityScheduleId)}
                      className={`grid min-h-20 w-full grid-cols-[4.5rem_minmax(0,1fr)_1rem] items-start gap-x-2 gap-y-1 px-1 py-4 text-left focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-primary sm:grid-cols-[5.25rem_minmax(0,1fr)_1rem] sm:gap-x-3 lg:px-3 ${isSelected ? "lg:rounded-xl lg:bg-panel" : "hover:bg-panel/50"}`}
                    >
                      <span className="pt-0.5 font-display text-sm font-bold text-ink tabular-nums">
                        {formatSeoulTime(schedule.startAt, locale) ?? "—"}
                      </span>
                      <span className="col-start-2 line-clamp-2 min-w-0 text-sm font-semibold break-words text-ink">
                        {activity.activityTitle}
                      </span>
                      <ChevronRightIcon aria-hidden="true" className="mt-1 size-4 text-muted" />
                      <span className="col-span-2 col-start-2 flex min-w-0 flex-nowrap gap-x-1.5 overflow-x-auto text-xs whitespace-nowrap text-muted sm:col-span-1 sm:col-start-2 sm:gap-x-3 [&>span]:shrink-0">
                        <span className="font-semibold text-primary">
                          {t("participants")}{" "}
                          {query.isError ? "—" : t("profileGuests", { count: guestCount(active) })}
                        </span>
                        {query.isError ? (
                          <span>{approval("pending")} —</span>
                        ) : pending.length ? (
                          <span>
                            {approval("pending")} {t("recordCount", { count: pending.length })}
                          </span>
                        ) : null}
                        {query.isError || cancelled === undefined ? (
                          <span>{t("cancellationHistory")} —</span>
                        ) : cancelled.length ? (
                          <span>{t("cancellationCount", { count: cancelled.length })}</span>
                        ) : null}
                        {query.data?.applicants.some((item) =>
                          isDeclinedApplicationStatus(item.status),
                        ) ? (
                          <span>
                            {statusLabel("declined")}{" "}
                            {t("recordCount", {
                              count: query.data.applicants.filter((item) =>
                                isDeclinedApplicationStatus(item.status),
                              ).length,
                            })}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          {showingDetail && selected ? (
            <section id={detailId} aria-label={t("sessionDetails")} className="max-w-3xl min-w-0">
              <button
                ref={backRef}
                type="button"
                onClick={returnToList}
                className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-ink"
              >
                <ArrowLeftIcon className="size-4" />
                {t("backToSessions")}
              </button>
              <DashboardSessionDetail
                key={selected.schedule.activityScheduleId}
                activityId={selected.activity.activityId}
                activityTitle={selected.activity.activityTitle}
                schedule={selected.schedule}
                query={selected.query}
                referral={
                  myActivities.find((item) => item.activityId === selected.activity.activityId)
                    ?.activityType === "REFERRAL"
                }
                room={rooms.find(
                  (room) => room.activityScheduleId === selected.schedule.activityScheduleId,
                )}
                onOpenProfile={onOpenProfile}
              />
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
