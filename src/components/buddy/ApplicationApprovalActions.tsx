"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { approveApplication, rejectApplication } from "@/lib/api/application-approval";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { BUDDY_REJECTION_REASONS } from "@/lib/application-approval";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { ApprovalDeadline, useApprovalExpired } from "@/components/booking/ApprovalDeadline";
import type { BuddyRejectionReason, BuddyRejectionRequest } from "@/types/application";

const buttonClass =
  "min-h-11 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-40";

export function ApplicationApprovalActions({
  applicationId,
  expiresAt,
  name,
  onPendingChange,
  fullWidth = false,
}: Readonly<{
  applicationId: number;
  expiresAt?: string | null;
  name: string;
  onPendingChange?: (pending: boolean) => void;
  fullWidth?: boolean;
}>) {
  const t = useTranslations("Approval");
  const queryClient = useQueryClient();
  const getError = useApiErrorMessage();
  const [rejectOpen, setRejectOpen] = useState(false);
  const busy = useRef(false);
  const expired = useApprovalExpired(expiresAt);
  const refresh = () =>
    Promise.all(
      ["buddy", "applications", "referral", "activities", "chat"].map((key) =>
        queryClient.invalidateQueries({ queryKey: [key] }),
      ),
    );
  const mutation = useMutation({
    mutationFn: (request: BuddyRejectionRequest | undefined) =>
      request ? rejectApplication(applicationId, request) : approveApplication(applicationId),
    onSettled: refresh,
  });
  useAuthQueryRedirect(mutation.error);
  useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);
  const code = mutation.error instanceof ApiClientError ? mutation.error.code : null;
  const forbidden = code === "USER403_BUDDY" || code === "ACTIVITY403_OWNER";
  const stale =
    code === "APPLICATION409_APPROVAL" ||
    code === "APPLICATION409_APPROVAL_EXPIRED" ||
    code === "APPLICATION404" ||
    code === "USER404";
  const disabled = mutation.isPending || expired || stale || forbidden;
  async function submit(request?: BuddyRejectionRequest) {
    if (busy.current || disabled) return;
    busy.current = true;
    try {
      await mutation.mutateAsync(request);
      setRejectOpen(false);
    } catch {
      /* The mutation error is rendered below; never assume the command failed server-side. */
    } finally {
      busy.current = false;
    }
  }
  let errorMessage = getError(mutation.error, t("error"));
  if (code === "APPLICATION409_APPROVAL_EXPIRED") errorMessage = t("expired");
  else if (code === "APPLICATION409_APPROVAL") errorMessage = t("changed");
  else if (code === "APPLICATION400_REJECTION") errorMessage = t("invalid");
  else if (forbidden) errorMessage = t("forbidden");
  return (
    <div className="min-w-0 text-left">
      <ApprovalDeadline expiresAt={expiresAt} />
      {fullWidth && !expired && (
        <p className="mt-1 text-xs leading-5 text-muted">{t("deadlineHint")}</p>
      )}
      {!forbidden && (
        <div
          className={fullWidth ? "mt-5 grid grid-cols-2 gap-2" : "mt-2 flex flex-wrap gap-2"}
          aria-label={name}
        >
          <button
            type="button"
            disabled={disabled}
            className={`${buttonClass} border border-line-strong text-ink enabled:hover:border-primary enabled:hover:text-primary`}
            onClick={() => setRejectOpen(true)}
          >
            {t("reject")}
          </button>
          <button
            type="button"
            disabled={disabled}
            className={`${buttonClass} bg-primary text-on-primary enabled:hover:bg-primary-hover`}
            onClick={() => void submit()}
          >
            {t(mutation.isPending ? "working" : "approve")}
          </button>
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="mt-2 max-w-sm text-xs leading-5 text-danger">
          {errorMessage}
        </p>
      )}
      {(expired || mutation.error) && (
        <button
          type="button"
          disabled={mutation.isPending}
          className="min-h-11 text-xs text-primary underline"
          onClick={() => void refresh()}
        >
          {t("retry")}
        </button>
      )}
      {rejectOpen && (
        <RejectDialog
          name={name}
          busy={mutation.isPending}
          disabled={disabled}
          error={mutation.error ? errorMessage : null}
          onClose={() => setRejectOpen(false)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}

function RejectDialog({
  name,
  busy,
  disabled,
  error,
  onClose,
  onSubmit,
}: Readonly<{
  name: string;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (request: BuddyRejectionRequest) => Promise<void>;
}>) {
  const t = useTranslations("Approval");
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<BuddyRejectionReason | "">("");
  const [detail, setDetail] = useState("");
  const valid =
    !!reason &&
    (reason !== "BUDDY_OTHER" || (detail.trim().length > 0 && detail.trim().length <= 255));
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
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
      className="motion-dialog m-0 mt-auto max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border-0 bg-canvas-soft p-5 text-ink backdrop:bg-ink/40 md:m-auto md:max-w-md md:rounded-2xl md:p-6"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !disabled)
            void onSubmit({
              reason: reason as BuddyRejectionReason,
              ...(reason === "BUDDY_OTHER" ? { detail } : {}),
            });
        }}
      >
        <h2 id={id} className="font-display text-lg font-bold">
          {t("rejectTitle")}
        </h2>
        <p className="mt-1 truncate text-sm font-medium">{name}</p>
        <p className="mt-2 text-xs leading-5 text-muted">{t("rejectHint")}</p>
        <fieldset disabled={busy} className="mt-5 space-y-2">
          <legend className="sr-only">{t("detail")}</legend>
          {BUDDY_REJECTION_REASONS.map((value) => (
            <label
              key={value}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${reason === value ? "border-primary text-primary" : "border-line-soft text-ink"}`}
            >
              <input
                type="radio"
                name={id}
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-4 shrink-0 accent-primary"
              />
              {t(`reasons.${value}`)}
            </label>
          ))}
          {reason === "BUDDY_OTHER" && (
            <label className="block pt-2 text-xs text-muted">
              {t("detail")}
              <textarea
                value={detail}
                onChange={(event) => setDetail(event.target.value)}
                maxLength={255}
                rows={3}
                className="focus-border-only mt-2 w-full resize-y rounded-xl border border-line-strong p-3 text-sm text-ink focus:border-primary"
              />
              <span className="block text-right tabular-nums">{detail.length}/255</span>
            </label>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {error}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            className={`${buttonClass} border border-line-strong text-muted`}
            onClick={onClose}
          >
            {t("keep")}
          </button>
          <button
            type="submit"
            disabled={!valid || disabled}
            className={`${buttonClass} bg-danger text-white`}
          >
            {t(busy ? "working" : "reject")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
