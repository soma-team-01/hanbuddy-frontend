"use client";

import type { TouristActivitySummary } from "@/types/activity";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { getLocaleOrDefault } from "@/i18n/routing";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";
import { useMeasurementEvents } from "@/components/analytics/AnalyticsProvider";
import { withActivityDate } from "@/lib/activity-booking-window";

export function ActivityFeed({
  initialActivities,
  date,
}: Readonly<{ initialActivities?: TouristActivitySummary[]; date?: string }> = {}) {
  const t = useTranslations("Explore");
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const getApiErrorMessage = useApiErrorMessage();
  const { trackList, trackSelection } = useMeasurementEvents();
  const activitiesQuery = useQuery({
    ...touristActivitiesQueryOptions(language, getDefaultDisplayCurrency(locale), date),
    initialData: initialActivities,
  });

  const activities = useMemo(
    () => (activitiesQuery.data ?? []).map(mapTouristActivitySummaryToActivity),
    [activitiesQuery.data],
  );
  const itemIds = useMemo(() => activities.map((activity) => activity.id), [activities]);
  const listVersion = itemIds.join(".");
  useEffect(() => {
    if (activitiesQuery.isSuccess && activities.length > 0) trackList(itemIds, listVersion);
  }, [activitiesQuery.isSuccess, activities.length, itemIds, listVersion, trackList]);

  if (activitiesQuery.isPending) {
    return (
      <div data-testid="activity-list" className="flex flex-col divide-y divide-line-soft">
        <p className="sr-only">{t("loading")}</p>
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3.5 py-4 md:gap-5 md:py-5">
            <div className="aspect-square w-[36%] max-w-44 shrink-0 animate-pulse rounded-xl bg-panel-raised md:w-44 md:max-w-none lg:w-52" />
            <div className="flex flex-1 flex-col gap-2.5 pt-1">
              <div className="h-3 w-1/3 animate-pulse rounded-full bg-panel-raised" />
              <div className="h-4 w-3/4 animate-pulse rounded-full bg-panel-raised" />
              <div className="h-3.5 w-1/4 animate-pulse rounded-full bg-panel-raised" />
              <div className="mt-auto ml-auto h-5 w-1/3 animate-pulse rounded-full bg-panel-raised" />
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
    <div className="flex flex-col gap-4">
      {/* GetYourGuide처럼 모든 폭에서 구분선으로 나눈 가로형 행 목록 */}
      <div data-testid="activity-list" className="flex flex-col divide-y divide-line-soft">
        {activities.map((activity, index) => (
          <Link
            key={activity.id}
            href={withActivityDate(`/activities/${activity.id}`, date)}
            onClick={() => trackSelection(activity.id, index + 1)}
            className="motion-reveal motion-press block"
            style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
          >
            <ActivityCard activity={activity} variant="row" eagerImage={index === 0} />
          </Link>
        ))}
      </div>
    </div>
  );
}
