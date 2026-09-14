"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { updateMyActivityStatus } from "@/lib/api/buddy";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { activityKeys } from "@/lib/query/activities";
import { buddyKeys } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type {
  MyActivityDetailResponse,
  MyActivityStatus,
  MyActivitySummaryResponse,
} from "@/types/buddy";

interface ActivityVisibilityControlProps {
  activityId: number;
  title: string;
  status: MyActivityStatus;
  compact?: boolean;
  disabled?: boolean;
}

/** 현재 공개 상태와 전환 동작을 한 컨트롤로 보여준다. */
export function ActivityVisibilityControl({
  activityId,
  title,
  status,
  compact = false,
  disabled = false,
}: Readonly<ActivityVisibilityControlProps>) {
  const t = useTranslations("MyActivities");
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isPublic = status === "ACTIVE";
  const nextStatus = isPublic ? "INACTIVE" : "ACTIVE";

  const mutation = useMutation({
    mutationFn: async () =>
      unwrapApiResult(await updateMyActivityStatus(activityId, nextStatus), "activity"),
    onSuccess: async (updatedActivity) => {
      queryClient.setQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
        (current = []) =>
          current.map((activity) =>
            activity.activityId === updatedActivity.activityId
              ? { ...activity, status: updatedActivity.status }
              : activity,
          ),
      );
      queryClient.setQueryData<MyActivityDetailResponse>(
        buddyKeys.activityDetail(activityId),
        updatedActivity,
      );
      setDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: buddyKeys.myActivities() }),
        queryClient.invalidateQueries({ queryKey: buddyKeys.activityDetail(activityId) }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });

  useAuthQueryRedirect(mutation.error);

  if (status !== "ACTIVE" && status !== "INACTIVE") return null;

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={isPublic}
        aria-label={
          isPublic ? t("makePrivateActivity", { title }) : t("publishActivity", { title })
        }
        disabled={disabled || mutation.isPending}
        onClick={() => {
          mutation.reset();
          setDialogOpen(true);
        }}
        className={`relative inline-flex shrink-0 items-center rounded-full border font-display font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${
          compact
            ? "min-h-5 gap-0.5 px-1 text-[8px] leading-none after:absolute after:-inset-1"
            : "min-h-9 gap-2 px-3 text-xs"
        } ${
          isPublic
            ? "border-primary/35 bg-primary-soft text-primary-strong hover:border-primary"
            : "border-line-strong bg-canvas-soft text-muted hover:border-primary hover:text-primary-strong"
        }`}
      >
        <span>{isPublic ? t("visibilityPublic") : t("visibilityPrivate")}</span>
        <span
          aria-hidden="true"
          className={`relative inline-flex rounded-full transition-colors ${
            compact ? "h-3 w-5" : "h-5 w-9"
          } ${isPublic ? "bg-primary" : "bg-line-strong"}`}
        >
          <span
            className={`absolute top-0.5 rounded-full bg-on-primary shadow-sm transition-transform ${
              compact ? "size-2" : "size-4"
            } ${isPublic ? (compact ? "translate-x-2" : "translate-x-4") : "translate-x-0.5"}`}
          />
        </span>
      </button>

      {dialogOpen ? (
        <ConfirmDialog
          title={nextStatus === "INACTIVE" ? t("makePrivateTitle") : t("publishTitle")}
          description={
            nextStatus === "INACTIVE" ? t("makePrivateDescription") : t("publishDescription")
          }
          confirmLabel={nextStatus === "INACTIVE" ? t("makePrivate") : t("publish")}
          pendingLabel={t("changingStatus")}
          isPending={mutation.isPending}
          onConfirm={() => mutation.mutate()}
          onClose={() => {
            if (!mutation.isPending) setDialogOpen(false);
          }}
        >
          {mutation.error ? (
            <p role="alert" className="border-l-2 border-danger py-1 pl-3 text-sm text-danger">
              {getApiErrorMessage(mutation.error, t("statusChangeError"))}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
