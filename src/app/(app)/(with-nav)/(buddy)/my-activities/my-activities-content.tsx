"use client";

import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TrashIcon, UsersIcon } from "@/components/ui/icons";
import { deleteMyActivity } from "@/lib/api/buddy";
import { getActivityThumbnail, getMyActivityStatusLabel } from "@/lib/api/buddy-view";
import { buddyKeys, myActivitiesQueryOptions } from "@/lib/query/buddy";
import { unwrapApiResult } from "@/lib/query/result";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { MyActivityStatus, MyActivitySummaryResponse } from "@/types/buddy";

const STATUS_BADGE_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  DRAFT: "bg-chip text-ink-soft",
  INACTIVE: "bg-warning-soft text-warning",
};

export function MyActivitiesContent() {
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
    return <p className="py-10 text-center text-ink-soft">Loading activities...</p>;
  }

  if (activitiesQuery.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {activitiesQuery.error.message}
      </p>
    );
  }

  if (activities.length === 0) {
    return <p className="py-10 text-center text-ink-soft">No activities yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {deleteActivityMutation.error ? (
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {deleteActivityMutation.error.message}
        </p>
      ) : null}
      {activities.map((activity) => (
        <article
          key={activity.activityId}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
        >
          <Link
            href={`/my-activities/${activity.activityId}/applicants`}
            className="relative block h-44 w-full overflow-hidden rounded-xl transition-opacity hover:opacity-90"
          >
            <Image
              src={getActivityThumbnail(activity.thumbnailImageUrl)}
              alt={activity.title}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
            />
          </Link>
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 font-display text-xs font-semibold ${
                STATUS_BADGE_CLASS[activity.status]
              }`}
            >
              {getMyActivityStatusLabel(activity.status)}
            </span>
            <button
              type="button"
              aria-label={`Delete ${activity.title}`}
              onClick={() => setDeleteTargetId(activity.activityId)}
              disabled={deleteActivityMutation.isPending}
              className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-chip disabled:cursor-not-allowed disabled:opacity-50"
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
          <p className="line-clamp-2 text-base text-ink-soft">{activity.description}</p>
          <Link
            href={`/my-activities/${activity.activityId}/applicants`}
            className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-earth hover:underline"
          >
            <UsersIcon className="size-3.5" />
            View applicants
          </Link>
        </article>
      ))}
      {deleteTargetId !== null && (
        <ConfirmDialog
          title="Delete this activity?"
          description="This action cannot be undone."
          confirmLabel="Delete"
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
