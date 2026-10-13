"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatSeoulDateTime } from "@/lib/datetime";
import { formatNationalityCode, getApplicantContactParts } from "@/lib/api/buddy-view";
import { isDeclinedApplicationStatus } from "@/lib/application-approval";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { scheduleCancellationQueryOptions } from "@/lib/query/schedule-cancellation";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type {
  BuddyActivityApplicationsResponse,
  BuddyApplicationApplicantSummaryResponse,
  BuddyDateScheduleApplicationsResponse,
} from "@/types/buddy";
import type { ScheduleCancellationApplicant } from "@/types/schedule-cancellation";
import { ScheduleActions } from "./ScheduleActions";
import { PendingReservationDialog } from "./PendingReservationSection";
import { ApprovalDeadline } from "@/components/booking/ApprovalDeadline";
import { ScheduleRefundStatus } from "@/components/booking/ScheduleRefundStatus";
import { CancellationReasonText } from "@/components/activity/CancellationReasonText";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { Avatar } from "@/components/ui/Avatar";
import { CalendarIcon, ChatBubbleDotsIcon, UsersIcon } from "@/components/ui/icons";

type View = "participants" | "pending" | "history" | "declined";
const statusTones: Record<View, string> = {
  participants: "bg-success-soft text-success",
  pending: "bg-warning-soft text-warning",
  history: "bg-danger/10 text-danger",
  declined: "bg-panel text-muted",
};
type Applicant = BuddyApplicationApplicantSummaryResponse;
const countGuests = (applicants: Applicant[]) =>
  applicants.reduce((total, item) => total + item.guestCount, 0);

export function DashboardSessionDetail({
  activityId,
  activityTitle,
  schedule,
  query,
  referral,
  room,
  onOpenProfile,
}: Readonly<{
  activityId: number;
  activityTitle: string;
  schedule: BuddyDateScheduleApplicationsResponse;
  query: UseQueryResult<BuddyActivityApplicationsResponse, Error>;
  referral: boolean;
  room?: { chatRoomId: number; activityScheduleCancelled?: boolean };
  onOpenProfile: (applicant: Applicant) => void;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("BuddyDashboard");
  const approval = useTranslations("Approval");
  const statusLabel = useTranslations("Status");
  const cancellation = useTranslations("ScheduleCancellation");
  const getError = useApiErrorMessage();
  const cancellationQuery = useQuery(scheduleCancellationQueryOptions(schedule.activityScheduleId));
  useAuthQueryRedirect(cancellationQuery.error);
  const isCancelled =
    room?.activityScheduleCancelled || cancellationQuery.data?.status === "CANCELLED";
  const [view, setView] = useState<View>("participants");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const records = query.data?.applicants ?? schedule.applicants;
  // A cancelled session can briefly return stale application states while refunds settle.
  // Never expose approval actions or count these records as confirmed participants.
  const groups: Record<View, Applicant[]> = {
    participants: isCancelled
      ? []
      : records.filter(
          (item) => !item.status || item.status === "CONFIRMED" || item.status === "COMPLETED",
        ),
    pending: isCancelled ? [] : records.filter((item) => item.status === "PENDING_APPROVAL"),
    history: records.filter(
      (item) =>
        item.status === "CANCELLED" ||
        item.status === "SUPERSEDED" ||
        (isCancelled &&
          (item.status === "CONFIRMED" ||
            item.status === "COMPLETED" ||
            item.status === "PENDING_APPROVAL")),
    ),
    declined: records.filter((item) => isDeclinedApplicationStatus(item.status ?? "")),
  };
  // Keep an active filter visible after its final record changes state on refresh.
  const views = (["participants", "pending", "history", "declined"] as const).filter(
    (item) =>
      item === "participants" || item === "history" || groups[item].length > 0 || item === view,
  );
  const label = (item: View) =>
    item === "pending"
      ? approval("pending")
      : item === "declined"
        ? statusLabel("declined")
        : t(item === "participants" ? "participants" : "cancellationHistory");
  const canApprove = query.isSuccess && cancellationQuery.isSuccess && !isCancelled;
  const selected =
    canApprove && view === "pending"
      ? groups.pending.find((applicant) => applicant.applicationId === selectedId)
      : undefined;

  return (
    <div className="relative min-w-0">
      <div className="relative flex flex-wrap items-start justify-between gap-x-4 gap-y-3 max-md:gap-y-2">
        <div className="min-w-0 flex-1 basis-44 pr-12 max-md:basis-full">
          <Link href={`/my-activities/${activityId}`} className="hover:underline">
            <h3 className="font-display text-lg leading-7 font-bold break-words text-ink">
              {activityTitle}
            </h3>
          </Link>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <CalendarIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{formatSeoulDateTime(schedule.startAt, locale)}</span>
          </p>
          {isCancelled ? (
            <span className="mt-3 inline-flex rounded-md bg-panel px-2 py-1 text-xs font-semibold text-muted">
              {cancellation("cancelled")}
            </span>
          ) : null}
        </div>
      </div>

      {cancellationQuery.data?.status === "CANCELLED" ? (
        <div className="mt-5 rounded-xl border border-line-soft bg-panel/40 px-4 py-3 text-sm text-muted">
          <p className="text-xs font-semibold">{cancellation("reason")}</p>
          {cancellationQuery.data.reason ? (
            <div className="mt-1 [overflow-wrap:anywhere]">
              <CancellationReasonText
                kind="schedule"
                id={schedule.activityScheduleId}
                originalText={cancellationQuery.data.reason}
              />
            </div>
          ) : null}
          {cancellationQuery.data.cancelledAt ? (
            <p className="mt-2 text-xs">
              {formatSeoulDateTime(cancellationQuery.data.cancelledAt, locale)}
            </p>
          ) : null}
        </div>
      ) : null}
      {cancellationQuery.isError ? (
        <div role="alert" className="mt-4 text-xs text-muted">
          <p>{cancellation("loadError")}</p>
          <button
            type="button"
            onClick={() => void cancellationQuery.refetch()}
            disabled={cancellationQuery.isFetching}
            className="min-h-11 underline disabled:opacity-50"
          >
            {cancellation("retry")}
          </button>
        </div>
      ) : null}

      <div
        className="mt-6 flex flex-nowrap gap-3 overflow-x-auto border-b border-line-soft max-md:mt-4 max-md:grid max-md:auto-cols-[minmax(max-content,1fr)] max-md:grid-flow-col max-md:gap-0 md:gap-5"
        aria-label={t("applicationViews")}
      >
        {views.map((item) => (
          <button
            type="button"
            key={item}
            aria-pressed={view === item}
            onClick={() => {
              setView(item);
              setSelectedId(null);
            }}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1 border-b-2 py-2 text-xs whitespace-nowrap max-md:justify-center max-md:px-1 sm:gap-2 sm:text-sm ${view === item ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {label(item)}{" "}
            <span className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${statusTones[item]}`}>
              {query.isError || (!query.data && item !== "participants")
                ? "—"
                : item === "participants"
                  ? t("profileGuests", { count: countGuests(groups[item]) })
                  : t("recordCount", { count: groups[item].length })}
            </span>
          </button>
        ))}
      </div>
      {query.isError ? (
        <div role="alert" className="py-4 text-xs leading-5 text-danger">
          <p>{getError(query.error, t("recordsLoadError"))}</p>
          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="min-h-11 underline disabled:opacity-50"
          >
            {t("retryRecords")}
          </button>
        </div>
      ) : null}
      <ScheduleActions
        compactMobile
        menuPlacement="session-header"
        showChat={view === "participants"}
        referral={referral}
        scheduleId={schedule.activityScheduleId}
        startAt={schedule.startAt}
        applicantCount={countGuests(groups.participants)}
        roomId={room?.chatRoomId}
        knownCancelled={Boolean(isCancelled)}
        showCancelledBadge={false}
      />
      <div aria-live="polite">
        <ul className="divide-y divide-line-soft">
          {groups[view].map((applicant) => (
            <SessionApplicant
              key={applicant.applicationId}
              applicant={applicant}
              onOpenProfile={onOpenProfile}
              cancelled={Boolean(isCancelled)}
              canApprove={canApprove}
              onOpenRequest={() => setSelectedId(applicant.applicationId)}
              refund={cancellationQuery.data?.applicants.find(
                (task) => task.applicationId === applicant.applicationId,
              )}
            />
          ))}
        </ul>
        {query.isPending ? (
          <p className="py-8 text-center text-sm text-muted">{t("loadingRecords")}</p>
        ) : !query.isError && !groups[view].length ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted">
            <span
              className={`flex size-10 items-center justify-center rounded-full ${statusTones[view]}`}
            >
              <UsersIcon aria-hidden="true" className="size-5" />
            </span>
            <p>
              {t(
                view === "participants"
                  ? "noSessionParticipants"
                  : view === "history"
                    ? "noSessionCancellations"
                    : "noMatchingApplications",
              )}
            </p>
          </div>
        ) : null}
      </div>
      {selected && (
        <PendingReservationDialog
          key={selected.applicationId}
          request={{
            activityId,
            activityTitle,
            activityScheduleId: schedule.activityScheduleId,
            startAt: schedule.startAt,
            applicant: selected,
          }}
          locale={locale}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function SessionApplicant({
  applicant,
  onOpenProfile,
  cancelled,
  canApprove,
  onOpenRequest,
  refund,
}: Readonly<{
  applicant: Applicant;
  onOpenProfile: (applicant: Applicant) => void;
  cancelled: boolean;
  canApprove: boolean;
  onOpenRequest: () => void;
  refund?: ScheduleCancellationApplicant;
}>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("BuddyDashboard");
  const tChat = useTranslations("Chat");
  const approval = useTranslations("Approval");
  const contact = getApplicantContactParts(applicant, locale);
  const declined = isDeclinedApplicationStatus(applicant.status ?? "");
  const isCancelled =
    !declined &&
    (cancelled || applicant.status === "CANCELLED" || applicant.status === "SUPERSEDED");
  const pending = !cancelled && applicant.status === "PENDING_APPROVAL";
  return (
    <li className="py-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => (pending ? onOpenRequest() : onOpenProfile(applicant))}
          disabled={pending && !canApprove}
          aria-haspopup="dialog"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
        >
          <Avatar
            name={applicant.applicantName}
            src={applicant.applicantProfileImageUrl}
            size={36}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {applicant.applicantName}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {formatNationalityCode(applicant.applicantNationalityCode, locale)} ·{" "}
              {t("profileGuests", { count: applicant.guestCount })}
            </span>
          </span>
        </button>
        <StartChatButton
          target={{ kind: "direct", targetUserId: applicant.applicantUserId }}
          label={tChat("messageApplicant", { name: applicant.applicantName })}
          icon={<ChatBubbleDotsIcon className="size-4" />}
          labelHidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line-soft text-muted hover:border-line-strong hover:text-ink"
        />
      </div>
      {contact.value && !isCancelled && !declined ? (
        <dl className="mt-1 ml-12 text-sm leading-6">
          <dt className="sr-only">{t("profileContact")}</dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="shrink-0 text-muted">{contact.method}</span>
            <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-ink">
              {contact.value}
            </span>
          </dd>
        </dl>
      ) : null}
      {applicant.specialRequest?.trim() ? (
        <details className="mt-3 rounded-lg bg-panel/50 px-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 text-xs font-medium text-muted">
            {t("specialRequestLabel")}
          </summary>
          <p className="pb-3 leading-6 [overflow-wrap:anywhere] whitespace-pre-line text-ink">
            {applicant.specialRequest}
          </p>
        </details>
      ) : null}
      {pending ? (
        <div className="mt-3 flex items-start gap-3 text-xs text-muted">
          <span className={`shrink-0 rounded-md px-2 py-1 font-medium ${statusTones.pending}`}>
            {approval("pending")}
          </span>
          {pending && (
            <button
              type="button"
              onClick={onOpenRequest}
              disabled={!canApprove}
              aria-haspopup="dialog"
              className="inline-flex min-h-6 min-w-0 flex-1 items-center py-0.5 text-left text-danger enabled:hover:text-primary-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applicant.approvalExpiresAt ? (
                <ApprovalDeadline expiresAt={applicant.approvalExpiresAt} inline tone="danger" />
              ) : (
                <span className="text-xs">{approval("pending")}</span>
              )}
            </button>
          )}
        </div>
      ) : null}
      {refund ? (
        <div className="mt-3">
          <ScheduleRefundStatus task={refund} />
        </div>
      ) : null}
    </li>
  );
}
