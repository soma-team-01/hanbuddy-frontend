"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { getTouristActivities } from "@/lib/api/activities";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import type { Activity } from "@/types/activity";

export function ActivityFeed() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    getTouristActivities().then((result) => {
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

      setActivities(result.activities.map(mapTouristActivitySummaryToActivity));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

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
    return <p className="py-10 text-center text-ink-soft">No activities available yet.</p>;
  }

  return (
    <>
      {activities.map((activity, index) => (
        <Link
          key={activity.id}
          href={`/activities/${activity.id}`}
          className="motion-reveal motion-press block rounded-xl hover:shadow-md"
          style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
        >
          <ActivityCard activity={activity} />
        </Link>
      ))}
    </>
  );
}
