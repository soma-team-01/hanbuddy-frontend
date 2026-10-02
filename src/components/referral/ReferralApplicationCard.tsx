"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { hasDateTimePassed } from "@/lib/datetime";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import type { Application } from "@/types/application";
import type { CancelDialogOutcome } from "@/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog";

export function ReferralApplicationCard({
  application,
  onCancel,
}: {
  application: Application;
  onCancel: () => Promise<CancelDialogOutcome>;
}) {
  const t = useTranslations("Referral");
  const getError = useApiErrorMessage();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const locked = useRef(false);
  return (
    <article
      className={`rounded-2xl border border-line-soft p-5 md:p-6 ${application.status === "cancelled" ? "bg-panel-raised" : "bg-white"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        <span className="text-xs font-semibold text-primary">{t("label")}</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href={`/applications/${application.id}/activity`}
            className="text-lg font-bold break-words hover:text-primary"
          >
            {application.activityTitle}
          </Link>
          <p className="mt-2 text-sm text-muted">
            {application.dateLabel} ·{" "}
            {t("people", { count: application.guestCount ?? application.breakdown?.guests ?? 1 })}
          </p>
          <p className="mt-1 text-sm text-muted">{application.hostName}</p>
        </div>
        {application.status === "confirmed" &&
          !application.scheduleCancelled &&
          !hasDateTimePassed(application.endAt) && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setOpen(true);
              }}
              className="min-h-11 rounded-xl border border-line-strong px-5 text-sm font-semibold hover:border-primary hover:text-primary"
            >
              {t("cancel")}
            </button>
          )}
      </div>
      <p className="mt-4 border-t border-line-soft pt-4 text-sm leading-6 text-muted">
        {t("notice")}
      </p>
      {application.cancellationDetail && (
        <p className="mt-2 text-sm text-muted">{application.cancellationDetail}</p>
      )}
      {open && (
        <ConfirmDialog
          title={t("cancelTitle")}
          description={t("cancelNotice")}
          confirmLabel={t("cancel")}
          cancelLabel={t("keep")}
          isPending={pending}
          tone="danger"
          onClose={() => {
            if (!locked.current) setOpen(false);
          }}
          onConfirm={async () => {
            if (locked.current) return;
            locked.current = true;
            setPending(true);
            try {
              const outcome = await onCancel();
              if (outcome.ok) setOpen(false);
              else setError(outcome.error);
            } catch (failure) {
              setError(failure);
            } finally {
              locked.current = false;
              setPending(false);
            }
          }}
        >
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {getError(error, t("failed"))}
            </p>
          ) : null}
        </ConfirmDialog>
      )}
    </article>
  );
}
