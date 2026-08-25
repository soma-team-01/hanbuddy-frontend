"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";

export function ActivityFeed() {
  const t = useTranslations("Explore");
  const language = getContentLanguage(useLocale());
  const getApiErrorMessage = useApiErrorMessage();
  const activitiesQuery = useQuery(touristActivitiesQueryOptions(language));

  const activities = (activitiesQuery.data ?? []).map(mapTouristActivitySummaryToActivity);

  if (activitiesQuery.isPending) {
    return (
      <div
        data-testid="activity-grid"
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <p className="sr-only">{t("loading")}</p>
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-line-soft bg-canvas-soft"
          >
            <div className="aspect-[16/9] w-full animate-pulse bg-panel-raised" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-panel-raised" />
              <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-panel-raised" />
              <div className="h-5 w-1/3 animate-pulse rounded-full bg-panel-raised" />
            </div>
          </div>
        ))}
      </div>
    );
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
    return (
      <div className="flex min-h-80 flex-col items-center justify-center text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-3xl">
          🗺️
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold">{t("empty")}</h2>
        <p className="mt-2 max-w-sm text-muted">{t("emptyDescription")}</p>
      </div>
    );
  }

  return (
    <div
      data-testid="activity-grid"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {activities.map((activity, index) => (
        <Link
          key={activity.id}
          href={`/activities/${activity.id}`}
          className="motion-reveal motion-press block rounded-2xl"
          style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
        >
          <ActivityCard activity={activity} eagerImage={index === 0} />
        </Link>
      ))}
    </div>
  );
}
