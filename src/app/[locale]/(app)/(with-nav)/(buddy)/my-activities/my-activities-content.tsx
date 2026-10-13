"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActivityVisibilityControl } from "@/components/buddy/ActivityVisibilityControl";
import { ActivityManageActions } from "@/components/buddy/ActivityManageActions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { deleteMyActivity } from "@/lib/api/buddy";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { mapActivitySummaryToActivity } from "@/lib/api/activity-view";
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
  useAuthQueryRedirect(activitiesQuery.error ?? deleteActivityMutation.error);

  const activities = activitiesQuery.data ?? [];

  async function handleDelete(activityId: number) {
    await deleteActivityMutation.mutateAsync(activityId).catch(() => undefined);
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
      <p aria-live="polite" className="sr-only">
        {deleteActivityMutation.isPending ? t("deleting") : ""}
      </p>
      <div data-testid="activity-records" className="flex flex-col divide-y divide-line-soft">
        {activities.map((activity, index) => (
          <div key={activity.activityId} className="pb-3">
            <Link
              href={`/my-activities/${activity.activityId}`}
              aria-label={activity.title}
              className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ActivityCard
                activity={mapActivitySummaryToActivity({
                  ...activity,
                  meetingPlaceId: activity.meetingPlaceId ?? "",
                  thumbnailImageUrl: getActivityThumbnail(activity.thumbnailImageUrl),
                })}
                variant="row"
                eagerImage={index === 0}
              />
            </Link>
            <div className="flex w-full items-center justify-between gap-2">
              {activity.status === "ACTIVE" || activity.status === "INACTIVE" ? (
                <ActivityVisibilityControl
                  activityId={activity.activityId}
                  title={activity.title}
                  status={activity.status}
                  disabled={deleteActivityMutation.isPending}
                />
              ) : (
                <span
                  className={`rounded-full px-2 py-1 font-display text-xs font-semibold ${
                    STATUS_BADGE_CLASS[activity.status]
                  }`}
                >
                  {t(`status.${STATUS_MESSAGE_KEY[activity.status]}`)}
                </span>
              )}
              <ActivityManageActions
                activityId={activity.activityId}
                title={activity.title}
                onDelete={() => setDeleteTargetId(activity.activityId)}
                disabled={deleteActivityMutation.isPending}
              />
            </div>
          </div>
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
    </div>
  );
}
