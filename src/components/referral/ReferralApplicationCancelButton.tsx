"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import type { CancelDialogOutcome } from "@/app/[locale]/(app)/(with-nav)/(tourist)/applications/cancel-dialog";

export function ReferralApplicationCancelButton({
  onCancel,
  className,
}: {
  onCancel: () => Promise<CancelDialogOutcome>;
  className: string;
}) {
  const t = useTranslations("Referral");
  const applications = useTranslations("Applications");
  const getError = useApiErrorMessage();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const locked = useRef(false);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {applications("cancel")}
      </button>
      {open && (
        <ConfirmDialog
          title={t("cancelTitle")}
          description={t("cancelNotice")}
          descriptionClassName="text-sm leading-6"
          confirmLabel={t("cancel")}
          cancelLabel={applications("keepApplication")}
          pendingLabel={applications("cancelling")}
          isPending={pending}
          variant="cancellation"
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
    </>
  );
}
