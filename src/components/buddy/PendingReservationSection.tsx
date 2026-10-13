"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/Avatar";
import { ZoomableAvatar } from "@/components/ui/ZoomableAvatar";
import { ApprovalDeadline } from "@/components/booking/ApprovalDeadline";
import { CalendarDaysIcon, ClockIcon, PlusIcon, UsersIcon, XIcon } from "@/components/ui/icons";
import { ApplicationApprovalActions } from "./ApplicationApprovalActions";
import { ApplicantTimestamps } from "./ApplicantTimestamps";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday, formatSeoulTime } from "@/lib/datetime";
import type { BuddyApplicationApplicantSummaryResponse } from "@/types/buddy";

/** View model composed from real activity, schedule and applicant fields. */
export interface PendingReservation {
  activityId: number;
  activityTitle: string;
  activityScheduleId: number;
  startAt: string;
  applicant: Pick<
    BuddyApplicationApplicantSummaryResponse,
    | "applicationId"
    | "applicantName"
    | "guestCount"
    | "specialRequest"
    | "status"
    | "approvalExpiresAt"
  > & { applicantProfileImageUrl?: string | null; appliedAt?: string };
}

export function PendingReservationSection({
  view = "preview",
  requests,
  loading = false,
  error,
  onRetry,
  totalCount = requests.length,
  hasMore = false,
  loadingMore = false,
  moreError,
  onLoadMore,
}: Readonly<{
  view?: "preview" | "list";
  requests: PendingReservation[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  totalCount?: number;
  hasMore?: boolean;
  loadingMore?: boolean;
  moreError?: string | null;
  onLoadMore?: () => void;
}>) {
  const t = useTranslations("Approval");
  const locale = useLocale() as Locale;
  const headingId = useId();
  const expanded = view === "list";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const pending = requests.filter(({ applicant }) => applicant.status === "PENDING_APPROVAL");
  const selected = pending.find(({ applicant }) => applicant.applicationId === selectedId);
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={headingId} className="font-display text-base font-bold text-ink md:text-lg">
          {t("inboxTitle")}{" "}
          {!loading && !error && (
            <span className="ml-2 text-primary tabular-nums">{totalCount}</span>
          )}
        </h2>
        {!expanded && (
          <Link
            href="/dashboard/requests"
            aria-label={t("inboxAll")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <PlusIcon className="size-5" aria-hidden />
          </Link>
        )}
      </div>
      {error ? (
        <div role="alert" className="text-sm text-danger">
          <p>{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="min-h-11 text-xs text-primary underline"
            >
              {t("retry")}
            </button>
          )}
        </div>
      ) : loading ? (
        <p role="status" className="py-5 text-sm text-muted">
          {t("working")}
        </p>
      ) : pending.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line-soft px-4 py-5 text-sm text-muted">
          {t("inboxEmpty")}
        </p>
      ) : (
        <ul
          className={
            expanded
              ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4"
              : "-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pt-1 pb-3"
          }
        >
          {pending.map((request) => (
            <li
              key={request.applicant.applicationId}
              className={expanded ? "min-w-0" : "w-52 shrink-0 snap-start md:w-64"}
            >
              <button
                type="button"
                onClick={() => setSelectedId(request.applicant.applicationId)}
                className="group flex h-full w-full flex-col rounded-2xl border border-line-soft bg-canvas-soft p-4 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="flex w-full min-w-0 items-center gap-2.5">
                  <Avatar
                    name={request.applicant.applicantName}
                    src={request.applicant.applicantProfileImageUrl}
                    size={32}
                  />
                  <span className="min-w-0 truncate font-display text-sm font-bold text-ink">
                    {request.applicant.applicantName}
                  </span>
                </span>
                <span
                  className="mt-3 line-clamp-1 text-xs text-muted"
                  title={request.activityTitle}
                >
                  {request.activityTitle}
                </span>
                <RequestSchedule request={request} locale={locale} />
                <span className="mt-2 w-full text-left">
                  <ApprovalDeadline
                    expiresAt={request.applicant.approvalExpiresAt}
                    inline
                    compact
                    tone="danger"
                  />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {expanded && !loading && !error && hasMore && onLoadMore && (
        <div className="mt-2">
          {moreError && (
            <p role="alert" className="text-xs text-danger">
              {moreError}
            </p>
          )}
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="min-h-11 text-xs font-semibold text-primary disabled:opacity-40"
          >
            {t(loadingMore ? "working" : moreError ? "retry" : "inboxMore")}
          </button>
        </div>
      )}
      {selected && (
        <PendingReservationDialog
          key={selected.applicant.applicationId}
          request={selected}
          locale={locale}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}

function RequestSchedule({
  request,
  locale,
}: Readonly<{ request: PendingReservation; locale: Locale }>) {
  const t = useTranslations("BuddyDashboard");
  return (
    <span className="mt-3 flex flex-col gap-1.5 text-sm text-muted">
      <span className="flex items-center gap-2">
        <CalendarDaysIcon className="size-4 shrink-0" aria-hidden />
        {formatSeoulDateWithWeekday(request.startAt, locale) ?? "—"}
      </span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-2">
          <ClockIcon className="size-4 shrink-0" aria-hidden />
          {formatSeoulTime(request.startAt, locale) ?? "—"}
        </span>
        <span className="flex items-center gap-1">
          <UsersIcon className="size-4 shrink-0" aria-hidden />
          {t("profileGuests", { count: request.applicant.guestCount })}
        </span>
      </span>
    </span>
  );
}

export function PendingReservationDialog({
  request,
  locale,
  onClose,
}: Readonly<{ request: PendingReservation; locale: Locale; onClose: () => void }>) {
  const accessibility = useTranslations("Accessibility");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const trigger = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className="motion-dialog m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-canvas-soft p-5 text-ink backdrop:bg-ink/40 md:m-auto md:max-w-sm md:rounded-2xl md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ZoomableAvatar
            name={request.applicant.applicantName}
            src={request.applicant.applicantProfileImageUrl}
            size={40}
          />
          <h2 id={id} className="min-w-0 font-display text-lg font-bold [overflow-wrap:anywhere]">
            {request.applicant.applicantName}
          </h2>
        </div>
        <button
          type="button"
          aria-label={accessibility("closeDialog")}
          disabled={busy}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary disabled:opacity-40"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-sm font-medium break-words">{request.activityTitle}</p>
      <RequestSchedule request={request} locale={locale} />
      {request.applicant.specialRequest?.trim() && (
        <p className="mt-4 border-t border-line-soft pt-4 text-sm leading-6 break-words whitespace-pre-line">
          {request.applicant.specialRequest}
        </p>
      )}
      <ApplicantTimestamps applicant={request.applicant} locale={locale} />
      <div className="mt-1.5">
        <ApplicationApprovalActions
          applicationId={request.applicant.applicationId}
          name={request.applicant.applicantName}
          expiresAt={request.applicant.approvalExpiresAt}
          deadlineTone="danger"
          onPendingChange={setBusy}
          fullWidth
        />
      </div>
    </dialog>
  );
}
