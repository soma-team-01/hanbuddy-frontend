"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";

const RECOMMENDED_LIMIT = 4;

export function RecommendedExperiences() {
  const t = useTranslations("Landing");
  const activitiesQuery = useQuery(touristActivitiesQueryOptions());

  if (activitiesQuery.isPending) {
    return (
      <section
        aria-labelledby="recommended-title"
        className="border-t border-line-soft bg-canvas-soft py-16 md:py-20"
      >
        <PageContainer>
          <RecommendedHeading />
          <p className="sr-only">{t("recommended.loading")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: RECOMMENDED_LIMIT }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-line-soft bg-panel"
              >
                <div className="aspect-[4/3] animate-pulse bg-panel-raised" />
                <div className="space-y-3 p-5">
                  <div className="h-5 w-3/4 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-4 w-1/2 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-panel-raised" />
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activitiesQuery.error || !activitiesQuery.data?.length) return null;

  const activities = activitiesQuery.data
    .slice(0, RECOMMENDED_LIMIT)
    .map(mapTouristActivitySummaryToActivity);

  return (
    <section
      aria-labelledby="recommended-title"
      className="border-t border-line-soft bg-canvas-soft py-16 md:py-20"
    >
      <PageContainer>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <RecommendedHeading />
          <Link
            href="/explore"
            className="font-display text-sm font-bold text-primary transition-colors hover:text-primary-hover"
          >
            {t("recommended.viewAll")}
            <span aria-hidden className="ml-2 text-base">
              →
            </span>
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
      </PageContainer>
    </section>
  );
}

function RecommendedHeading() {
  const t = useTranslations("Landing");

  return (
    <div className="max-w-2xl">
      <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
        {t("recommended.eyebrow")}
      </p>
      <h2
        id="recommended-title"
        className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
      >
        {t("recommended.title")}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted">{t("recommended.description")}</p>
    </div>
  );
}
