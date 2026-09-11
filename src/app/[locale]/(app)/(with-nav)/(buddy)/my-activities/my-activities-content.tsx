"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PencilIcon, TrashIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { deleteMyActivity, updateMyActivityStatus } from "@/lib/api/buddy";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { activityKeys } from "@/lib/query/activities";
import { buddyKeys, myActivitiesQueryOptions } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus, MyActivitySummaryResponse } from "@/types/buddy";

const STATUS_BADGE_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  DRAFT: "bg-panel-raised text-muted",
  INACTIVE: "bg-warning-soft text-warning",
  DELETED: "bg-panel-raised text-muted",
};

const STATUS_MESSAGE_KEY: Record<MyActivityStatus, "active" | "draft" | "inactive" | "deleted"> = {
  ACTIVE: "active",
  DRAFT: "draft",
  INACTIVE: "inactive",
  DELETED: "deleted",
};

export function MyActivitiesContent() {
  const t = useTranslations("MyActivities");
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    activityId: number;
    nextStatus: "ACTIVE" | "INACTIVE";
  } | null>(null);
  const activitiesQuery = useQuery(myActivitiesQueryOptions());
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: number) =>
      unwrapApiResult(await deleteMyActivity(activityId), "message"),
    onSuccess: (_message, activityId) => {
      queryClient.setQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
        (current = []) => current.filter((activity) => activity.activityId !== activityId),
      );
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: buddyKeys.all() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });
  const statusMutation = useMutation({
    mutationFn: async ({
      activityId,
      nextStatus,
    }: {
      activityId: number;
      nextStatus: "ACTIVE" | "INACTIVE";
    }) => unwrapApiResult(await updateMyActivityStatus(activityId, nextStatus), "activity"),
    onSuccess: (updatedActivity) => {
      queryClient.setQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
        (current = []) =>
          current.map((activity) =>
            activity.activityId === updatedActivity.activityId
              ? { ...activity, status: updatedActivity.status }
              : activity,
          ),
      );
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: buddyKeys.all() }),
        queryClient.invalidateQueries({ queryKey: activityKeys.all() }),
      ]);
    },
  });
  useAuthQueryRedirect(
    activitiesQuery.error ?? deleteActivityMutation.error ?? statusMutation.error,
  );

  const activities = activitiesQuery.data ?? [];

  async function handleDelete(activityId: number) {
    await deleteActivityMutation.mutateAsync(activityId).catch(() => undefined);
  }

  async function handleStatusChange(activityId: number, nextStatus: "ACTIVE" | "INACTIVE") {
    await statusMutation.mutateAsync({ activityId, nextStatus }).catch(() => undefined);
  }

  if (activitiesQuery.isPending) {
    return <p className="py-10 text-center text-muted">{t("loading")}</p>;
  }

  if (activitiesQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {getApiErrorMessage(activitiesQuery.error, t("loadError"))}
      </p>
    );
  }

  if (activities.length === 0) {
    return <p className="py-10 text-center text-muted">{t("empty")}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {deleteActivityMutation.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(deleteActivityMutation.error, t("deleteError"))}
        </p>
      ) : null}
      {statusMutation.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {getApiErrorMessage(statusMutation.error, t("statusChangeError"))}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {deleteActivityMutation.isPending
          ? t("deleting")
          : statusMutation.isPending
            ? t("changingStatus")
            : ""}
      </p>
      <div data-testid="activity-records" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {activities.map((activity, index) => (
          <article
            key={activity.activityId}
            className="flex flex-col gap-3 rounded-3xl border border-line-soft bg-canvas-soft p-4 shadow-[0_8px_22px_rgba(61,45,43,0.06)]"
          >
            <Link
              href={`/my-activities/${activity.activityId}`}
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl transition-opacity hover:opacity-90"
            >
              <Image
                src={getActivityThumbnail(activity.thumbnailImageUrl)}
                alt={activity.title}
                fill
                loading={index === 0 ? "eager" : undefined}
                sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                className="object-cover"
              />
            </Link>
            <div className="flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 font-display text-xs font-semibold ${
                  STATUS_BADGE_CLASS[activity.status]
                }`}
              >
                {t(`status.${STATUS_MESSAGE_KEY[activity.status]}`)}
              </span>
              <span className="flex items-center gap-1">
                {activity.status === "ACTIVE" || activity.status === "INACTIVE" ? (
                  <button
                    type="button"
                    aria-label={
                      activity.status === "ACTIVE"
                        ? t("makePrivateActivity", { title: activity.title })
                        : t("publishActivity", { title: activity.title })
                    }
                    onClick={() =>
                      setStatusTarget({
                        activityId: activity.activityId,
                        nextStatus: activity.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                      })
                    }
                    disabled={deleteActivityMutation.isPending || statusMutation.isPending}
                    className="mr-1 flex h-9 items-center justify-center rounded-full border border-line-strong px-3 font-display text-xs font-semibold text-ink transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {activity.status === "ACTIVE" ? t("makePrivate") : t("publish")}
                  </button>
                ) : null}
                <Link
                  href={`/my-activities/${activity.activityId}/edit`}
                  aria-label={t("editActivity", { title: activity.title })}
                  className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-primary-soft hover:text-primary-strong"
                >
                  <PencilIcon className="size-4" />
                </Link>
                <button
                  type="button"
                  aria-label={t("deleteActivity", { title: activity.title })}
                  onClick={() => setDeleteTargetId(activity.activityId)}
                  disabled={deleteActivityMutation.isPending || statusMutation.isPending}
                  className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <TrashIcon className="size-4" />
                </button>
              </span>
            </div>
            <Link href={`/my-activities/${activity.activityId}`} className="hover:underline">
              <h2 className="font-display text-xl leading-7 font-semibold text-ink">
                {activity.title}
              </h2>
            </Link>
            <p className="line-clamp-2 text-base text-muted">{activity.description}</p>
          </article>
        ))}
      </div>
      {deleteTargetId !== null && (
        <ConfirmDialog
          title={t("deleteTitle")}
          description={t("deleteDescription")}
          confirmLabel={t("delete")}
          tone="danger"
          onConfirm={() => {
            const activityId = deleteTargetId;
            setDeleteTargetId(null);
            void handleDelete(activityId);
          }}
          onClose={() => setDeleteTargetId(null)}
        />
      )}
      {statusTarget ? (
        <ConfirmDialog
          title={statusTarget.nextStatus === "INACTIVE" ? t("makePrivateTitle") : t("publishTitle")}
          description={
            statusTarget.nextStatus === "INACTIVE"
              ? t("makePrivateDescription")
              : t("publishDescription")
          }
          confirmLabel={statusTarget.nextStatus === "INACTIVE" ? t("makePrivate") : t("publish")}
          pendingLabel={t("changingStatus")}
          isPending={statusMutation.isPending}
          onConfirm={() => {
            const target = statusTarget;
            setStatusTarget(null);
            void handleStatusChange(target.activityId, target.nextStatus);
          }}
          onClose={() => setStatusTarget(null)}
        />
      ) : null}
    </div>
  );
}
