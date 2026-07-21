"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function ActivityFeed() {
  const t = useTranslations("Explore");
  const getApiErrorMessage = useApiErrorMessage();
  const activitiesQuery = useQuery(touristActivitiesQueryOptions());
  useAuthQueryRedirect(activitiesQuery.error);

  const activities = (activitiesQuery.data ?? []).map(mapTouristActivitySummaryToActivity);

  if (activitiesQuery.isPending) {
    return <p className="py-10 text-center text-ink-soft">{t("loading")}</p>;
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
    return <p className="py-10 text-center text-ink-soft">{t("empty")}</p>;
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
