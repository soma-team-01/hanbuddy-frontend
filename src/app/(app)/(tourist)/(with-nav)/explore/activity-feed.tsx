"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function ActivityFeed() {
  const activitiesQuery = useQuery(touristActivitiesQueryOptions());
  useAuthQueryRedirect(activitiesQuery.error);

  const activities = (activitiesQuery.data ?? []).map(mapTouristActivitySummaryToActivity);

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
    return <p className="py-10 text-center text-ink-soft">No activities available yet.</p>;
  }

  return (
    <>
      {activities.map((activity) => (
        <Link
          key={activity.id}
          href={`/activities/${activity.id}`}
          className="block rounded-xl transition-shadow hover:shadow-md"
        >
          <ActivityCard activity={activity} />
        </Link>
      ))}
    </>
  );
}
