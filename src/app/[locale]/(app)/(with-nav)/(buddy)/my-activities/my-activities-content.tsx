"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TrashIcon, UsersIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { deleteMyActivity } from "@/lib/api/buddy";
import { getActivityThumbnail } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { buddyKeys, myActivitiesQueryOptions } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus, MyActivitySummaryResponse } from "@/types/buddy";

const STATUS_BADGE_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  DRAFT: "bg-panel-raised text-muted",
  INACTIVE: "bg-warning-soft text-warning",
};

const STATUS_MESSAGE_KEY: Record<MyActivityStatus, "active" | "draft" | "inactive"> = {
  ACTIVE: "active",
  DRAFT: "draft",
  INACTIVE: "inactive",
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
    onMutate: async (activityId) => {
      await queryClient.cancelQueries({ queryKey: buddyKeys.myActivities() });
      const previousActivities = queryClient.getQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
      );
      queryClient.setQueryData<MyActivitySummaryResponse[]>(
        buddyKeys.myActivities(),
        (current = []) => current.filter((activity) => activity.activityId !== activityId),
      );
      return { previousActivities };
    },
    onError: (_error, _activityId, context) => {
      if (context?.previousActivities) {
        queryClient.setQueryData(buddyKeys.myActivities(), context.previousActivities);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: buddyKeys.myActivities() }),
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
      <div data-testid="activity-records" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {activities.map((activity, index) => (
          <article
            key={activity.activityId}
            className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-panel p-4 shadow-sm"
          >
            <Link
              href={`/my-activities/${activity.activityId}/applicants`}
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
              <button
                type="button"
                aria-label={t("deleteActivity", { title: activity.title })}
                onClick={() => setDeleteTargetId(activity.activityId)}
                disabled={deleteActivityMutation.isPending}
                className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
            <Link
              href={`/my-activities/${activity.activityId}/applicants`}
              className="hover:underline"
            >
              <h2 className="font-display text-xl leading-7 font-semibold text-ink">
                {activity.title}
              </h2>
            </Link>
            <p className="line-clamp-2 text-base text-muted">{activity.description}</p>
            <Link
              href={`/my-activities/${activity.activityId}/applicants`}
              className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-primary-strong hover:underline"
            >
              <UsersIcon className="size-3.5" />
              {t("viewApplicants")}
            </Link>
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
    </div>
  );
}
