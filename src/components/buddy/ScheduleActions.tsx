"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StartChatButton } from "@/components/chat/StartChatButton";
import { UsersIcon } from "@/components/ui/icons";
import { cancelSchedule, getScheduleCancellation } from "@/lib/api/schedule-cancellation";
import { ApiClientError } from "@/lib/api/errors";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatSeoulDateTime } from "@/lib/datetime";
import {
  cacheCancelledSchedule,
  scheduleCancellationQueryOptions,
} from "@/lib/query/schedule-cancellation";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

const CHAT_CLASS =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-primary px-2.5 py-1 font-display text-xs font-bold text-primary transition-colors hover:border-primary-strong hover:text-primary-strong disabled:opacity-60";

export function ScheduleActions({
  scheduleId,
  startAt,
  applicantCount,
  roomId,
  knownCancelled = false,
  menuPlacement = "inline",
  showCancelledBadge = true,
}: Readonly<{
  scheduleId: number;
  startAt: string;
  applicantCount: number;
  roomId?: number;
  knownCancelled?: boolean;
  /** card-header requires a positioned card and space reserved beside its title. */
  menuPlacement?: "inline" | "card-header";
  /** Hide when the page already displays the cancelled badge beside its title. */
  showCancelledBadge?: boolean;
}>) {
  const t = useTranslations("ScheduleCancellation");
  const tChat = useTranslations("Chat");
  const locale = useLocale();
  const getApiErrorMessage = useApiErrorMessage();
  const client = useQueryClient();
  const statusQuery = useQuery(scheduleCancellationQueryOptions(scheduleId));
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [now, setNow] = useState(Date.now);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const reasonId = useId();
  const cancelled = knownCancelled || statusQuery.data?.status === "CANCELLED";
  const hasStarted = !Number.isFinite(Date.parse(startAt)) || Date.parse(startAt) <= now;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function close(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  const mutation = useMutation({
    retry: false,
    mutationFn: async () => {
      try {
        const result = unwrapApiResult(await cancelSchedule(scheduleId, reason), "cancellation");
        if (result.status !== "CANCELLED") throw new Error("Cancellation not confirmed");
        return result;
      } catch (error) {
        // A lost POST response does not mean the cancellation failed. Never retry POST blindly.
        try {
          const check = unwrapApiResult(await getScheduleCancellation(scheduleId), "cancellation");
          client.setQueryData(scheduleCancellationQueryOptions(scheduleId).queryKey, check);
          if (check.status === "CANCELLED") return check;
        } catch {
          setUncertain(true);
        }
        throw error;
      }
    },
    onSuccess: (result) => {
      cacheCancelledSchedule(client, result);
      setDialogOpen(false);
      setUncertain(false);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  useAuthQueryRedirect(statusQuery.error ?? mutation.error);

  async function verify() {
    const result = await statusQuery.refetch();
    if (!result.isSuccess) return;
    setUncertain(false);
    mutation.reset();
    if (result.data.status === "CANCELLED") cacheCancelledSchedule(client, result.data);
  }

  const errorKey =
    mutation.error instanceof ApiClientError && mutation.error.code === "SCHEDULE400_STARTED"
      ? "started"
      : "requestError";

  return (
    <div data-schedule-cancelled={cancelled} className="flex shrink-0 flex-col items-end gap-1.5">
      {cancelled ? (
        showCancelledBadge ? (
          <span
            className={`rounded-full border border-primary/40 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-primary ${menuPlacement === "card-header" ? "absolute top-5 right-4" : ""}`}
          >
            {t("cancelled")}
          </span>
        ) : null
      ) : !hasStarted ? (
        <div
          ref={menuRef}
          className={menuPlacement === "card-header" ? "absolute top-4 right-4" : "relative"}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setMenuOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-label={t("more")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex size-8 items-center justify-center rounded-full text-xl leading-none text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute top-full right-0 z-30 mt-1 w-52 rounded-xl border border-line-soft bg-white p-2 shadow-lg">
              <button
                type="button"
                disabled={!statusQuery.isSuccess || statusQuery.isFetching}
                onClick={() => {
                  setMenuOpen(false);
                  setDialogOpen(true);
                  mutation.reset();
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {t("cancelAction")}
              </button>
              {statusQuery.isError ? (
                <button
                  type="button"
                  onClick={verify}
                  className="px-3 py-2 text-left text-xs text-muted underline"
                >
                  {t("loadError")} {t("retry")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {roomId ? (
        <Link href={`/chat/${roomId}`} className={CHAT_CLASS}>
          <UsersIcon className="size-3.5" />
          {tChat("openGroupChat")}
        </Link>
      ) : !cancelled &&
        !uncertain &&
        !mutation.isPending &&
        statusQuery.isSuccess &&
        applicantCount > 0 ? (
        <StartChatButton
          target={{ kind: "group", activityScheduleId: scheduleId }}
          label={tChat("createGroupChat")}
          icon={<UsersIcon className="size-3.5" />}
          className={CHAT_CLASS}
        />
      ) : null}
      {mutation.isSuccess ? (
        <p
          role="status"
          className={
            menuPlacement === "card-header" ? "sr-only" : "max-w-64 text-right text-xs text-muted"
          }
        >
          {t("success")}
        </p>
      ) : null}
      {dialogOpen && !cancelled ? (
        <ConfirmDialog
          title={t("title")}
          description={t("irreversible")}
          descriptionClassName="text-sm leading-6"
          cancelVariant="outline"
          cancelLabel={t("keep")}
          confirmLabel={t("confirm")}
          pendingLabel={t("pending")}
          tone="danger"
          isPending={mutation.isPending}
          confirmDisabled={uncertain || !reason.trim() || reason.trim().length > 255 || hasStarted}
          onClose={() => {
            if (!mutation.isPending) {
              setDialogOpen(false);
              triggerRef.current?.focus();
            }
          }}
          onConfirm={() => {
            if (Date.parse(startAt) <= Date.now()) {
              setNow(Date.now());
              return;
            }
            if (submitting.current || uncertain || hasStarted) return;
            submitting.current = true;
            mutation.mutate();
          }}
        >
          <p className="border-b border-line-soft pb-4 text-sm font-semibold text-primary">
            {formatSeoulDateTime(startAt, locale)}
          </p>
          <label htmlFor={reasonId} className="mt-5 block text-sm font-semibold">
            {t("reason")}
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={mutation.isPending}
            maxLength={255}
            rows={3}
            aria-describedby={`${reasonId}-hint`}
            className="mt-2 w-full resize-y rounded-xl border border-line-strong bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
          <div id={`${reasonId}-hint`} className="mt-1 flex gap-3 text-xs text-muted">
            <p className="flex-1">{t("reasonHint")}</p>
            <span>{reason.length}/255</span>
          </div>
          {hasStarted ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {t("started")}
            </p>
          ) : null}
          {mutation.isError || uncertain ? (
            <div role="alert" className="mt-4 text-sm text-danger">
              <p>{uncertain ? t("uncertain") : getApiErrorMessage(mutation.error, t(errorKey))}</p>
              <button
                type="button"
                disabled={statusQuery.isFetching || mutation.isPending}
                onClick={verify}
                className="mt-2 underline"
              >
                {t("retry")}
              </button>
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
