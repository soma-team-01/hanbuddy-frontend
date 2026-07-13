"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronDownIcon } from "@/components/ui/icons";
import { formatKrw } from "@/lib/format";
import type { Application, ApplicationCancellationReason } from "@/types/application";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function PriceBreakdown({ application }: Readonly<{ application: Application }>) {
  const [open, setOpen] = useState(false);
  const breakdown = application.breakdown;
  if (!breakdown) return null;

  const subtotal = breakdown.unitPrice * breakdown.guests;
  const total = subtotal + breakdown.serviceFee;

  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm text-ink-soft transition-colors hover:text-ink"
      >
        Price Breakdown
        <ChevronDownIcon className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
          <div className="flex justify-between">
            <span>
              {formatKrw(breakdown.unitPrice)} x {breakdown.guests} guests
            </span>
            <span>{formatKrw(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service fee</span>
            <span>{formatKrw(breakdown.serviceFee)}</span>
          </div>
          <div className="flex justify-between font-display font-semibold">
            <span>Total</span>
            <span>{formatKrw(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  onCancel,
}: Readonly<{ application: Application; onCancel: () => void }>) {
  const isCompleted = application.status === "completed";
  const isCancelled = application.status === "cancelled";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <StatusBadge status={application.status} />
        <span className="text-xs text-ink-soft">{application.dateLabel}</span>
      </div>
      <div className="flex items-center gap-4">
        <Avatar
          name={application.hostName}
          src={application.hostAvatarUrl}
          size={48}
          className={isCompleted ? "opacity-70" : ""}
        />
        <div className="min-w-0">
          <p
            className={`font-display text-sm font-semibold ${isCompleted || isCancelled ? "text-ink-soft" : "text-ink"}`}
          >
            {application.hostName}
          </p>
          <p className={`text-base ${isCompleted || isCancelled ? "text-ink-soft" : "text-ink"}`}>
            {application.activityTitle}
          </p>
        </div>
      </div>
      {application.status === "confirmed" && <PriceBreakdown application={application} />}
      {application.status === "pending_payment" && (
        <button
          type="button"
          disabled
          className="h-11 w-full cursor-not-allowed rounded-lg bg-forest font-display text-sm font-semibold text-cream opacity-60"
        >
          Pay Now · Coming soon
        </button>
      )}
      {application.status === "confirmed" && (
        <button
          type="button"
          onClick={onCancel}
          className="h-11 w-full rounded-lg bg-forest font-display text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          Cancel
        </button>
      )}
      {isCompleted && (
        <button
          type="button"
          disabled
          className="h-11 w-full cursor-not-allowed rounded-lg border border-line bg-chip font-display text-sm font-semibold text-ink-soft opacity-60"
        >
          Leave Review · Coming soon
        </button>
      )}
    </article>
  );
}

export function ApplicationList({
  applications,
  onCancelApplication,
}: Readonly<{
  applications: Application[];
  onCancelApplication: (
    applicationId: string,
    reason: ApplicationCancellationReason,
  ) => Promise<CancelDialogOutcome>;
}>) {
  const [tab, setTab] = useState<TabKey>("upcoming");
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);

  const visibleApplications = applications.filter((application) =>
    tab === "upcoming"
      ? application.status === "pending_payment" || application.status === "confirmed"
      : application.status === "completed" || application.status === "cancelled",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6 border-b border-line" role="tablist">
        {TABS.map(({ key, label }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 pb-3 font-display text-sm font-semibold transition-colors ${
                isActive
                  ? "border-forest text-forest"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-5">
        {visibleApplications.map((application) => (
          <ApplicationCard
            key={application.id}
            application={application}
            onCancel={() => setCancelTargetId(application.id)}
          />
        ))}
        {visibleApplications.length === 0 && (
          <p className="py-10 text-center text-ink-soft">No applications here yet.</p>
        )}
      </div>
      {cancelTargetId && (
        <CancelDialog
          onClose={() => setCancelTargetId(null)}
          onConfirm={async (reason) => {
            const outcome = await onCancelApplication(cancelTargetId, reason);
            if (outcome.ok) setCancelTargetId(null);
            return outcome;
          }}
        />
      )}
    </div>
  );
}
