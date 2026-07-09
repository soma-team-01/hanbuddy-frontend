"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TrashIcon, UsersIcon } from "@/components/ui/icons";
import { deleteMyActivity, getMyActivities } from "@/lib/api/buddy";
import { getActivityThumbnail, getMyActivityStatusLabel } from "@/lib/api/buddy-view";
import type { MyActivityStatus, MyActivitySummaryResponse } from "@/types/buddy";

const STATUS_BADGE_CLASS: Record<MyActivityStatus, string> = {
  ACTIVE: "bg-success-soft text-success",
  DRAFT: "bg-chip text-ink-soft",
  INACTIVE: "bg-warning-soft text-warning",
};

export function MyActivitiesContent() {
  const router = useRouter();
  const [activities, setActivities] = useState<MyActivitySummaryResponse[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingActivityId, setDeletingActivityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getMyActivities().then((result) => {
      if (!isMounted) return;
      if (result.status === "unauthenticated") {
        router.replace("/login");
        return;
      }
      if (result.status === "error") {
        setErrorMessage(result.message);
        setIsLoading(false);
        return;
      }

      setActivities(result.activities);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleDelete(activityId: number) {
    setDeletingActivityId(activityId);
    setErrorMessage("");
    const previousActivities = activities;
    setActivities((current) => current.filter((activity) => activity.activityId !== activityId));

    const result = await deleteMyActivity(activityId);
    if (result.status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (result.status === "error") {
      setErrorMessage(result.message);
      setActivities(previousActivities);
      setDeletingActivityId(null);
      return;
    }

    setDeletingActivityId(null);
  }

  if (isLoading) {
    return <p className="py-10 text-center text-ink-soft">Loading activities...</p>;
  }

  if (errorMessage) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
      >
        {errorMessage}
      </p>
    );
  }

  if (activities.length === 0) {
    return <p className="py-10 text-center text-ink-soft">No activities yet.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {activities.map((activity) => (
        <article
          key={activity.activityId}
          className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]"
        >
          <Link
            href={`/my-activities/${activity.activityId}/applicants`}
            className="relative block h-44 w-full overflow-hidden rounded-xl"
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
              disabled={deletingActivityId === activity.activityId}
              className="flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-chip disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon className="size-4" />
            </button>
          </div>
          <Link href={`/my-activities/${activity.activityId}/applicants`}>
            <h2 className="font-display text-xl leading-7 font-semibold text-ink">
              {activity.title}
            </h2>
          </Link>
          <p className="line-clamp-2 text-base text-ink-soft">{activity.description}</p>
          <Link
            href={`/my-activities/${activity.activityId}/applicants`}
            className="flex items-center gap-1.5 pt-1 text-xs font-semibold text-earth"
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
