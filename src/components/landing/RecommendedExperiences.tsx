"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityCard } from "@/components/ui/ActivityCard";
import { CompassIcon, MapIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { mapTouristActivitySummaryToActivity } from "@/lib/api/activity-view";
import { getContentLanguage } from "@/lib/content-language";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { getLocaleOrDefault } from "@/i18n/routing";
import { touristActivitiesQueryOptions } from "@/lib/query/activities";

const RECOMMENDED_LIMIT = 4;

export function RecommendedExperiences() {
  const t = useTranslations("Landing");
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const activitiesQuery = useQuery(
    touristActivitiesQueryOptions(language, getDefaultDisplayCurrency(locale)),
  );

  if (activitiesQuery.isPending) {
    return (
      <section
        aria-labelledby="recommended-title"
        className="border-t border-line-soft bg-canvas-soft py-10 md:py-16"
      >
        <PageContainer>
          <RecommendedHeading />
          <p className="sr-only">{t("recommended.loading")}</p>
          <div
            data-testid="recommended-track"
            className="recommended-track -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
          >
            {Array.from({ length: RECOMMENDED_LIMIT }, (_, index) => (
              <div
                key={index}
                className="w-[78vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl border border-line-soft bg-canvas-soft md:w-auto md:max-w-none"
              >
                <div className="aspect-[3/2] w-full animate-pulse bg-panel-raised md:aspect-[16/9]" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-5 w-1/3 animate-pulse rounded-full bg-panel-raised" />
                </div>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>
    );
  }

  if (activitiesQuery.error) {
    return (
      <RecommendedState
        kind="error"
        onRetry={() => {
          void activitiesQuery.refetch();
        }}
      />
    );
  }

  if (!activitiesQuery.data?.length) return <RecommendedState kind="empty" />;

  const activities = activitiesQuery.data
    .slice(0, RECOMMENDED_LIMIT)
    .map(mapTouristActivitySummaryToActivity);

  return (
    <section
      aria-labelledby="recommended-title"
      className="border-t border-line-soft bg-canvas-soft py-10 md:py-16"
    >
      <PageContainer>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <RecommendedHeading />
          <Link
            href="/explore"
            className="inline-flex min-h-11 items-center self-start font-display text-sm font-bold text-primary transition-colors hover:text-primary-hover"
          >
            {t("recommended.viewAll")}
            <span aria-hidden className="ml-2 text-base">
              →
            </span>
          </Link>
        </div>

        {/* 모바일은 스냅 가로 스와이프(다음 카드가 살짝 보임), md 이상은 그리드 */}
        <div
          data-testid="recommended-track"
          className="recommended-track -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-5 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4"
        >
          {activities.map((activity, index) => (
            <Link
              key={activity.id}
              href={`/activities/${activity.id}`}
              className="motion-reveal motion-press block w-[78vw] max-w-[320px] shrink-0 snap-start rounded-2xl md:w-auto md:max-w-none"
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

interface RecommendedStateProps {
  readonly kind: "empty" | "error";
  readonly onRetry?: () => void;
}

function RecommendedState({ kind, onRetry }: RecommendedStateProps) {
  const t = useTranslations("Landing");
  const isError = kind === "error";
  const Icon = isError ? CompassIcon : MapIcon;

  return (
    <section
      aria-labelledby="recommended-title"
      className="border-t border-line-soft bg-canvas-soft py-10 md:py-16"
    >
      <PageContainer>
        <RecommendedHeading />
        <div
          role={isError ? "alert" : undefined}
          className="mt-8 flex min-h-64 flex-col items-center justify-center rounded-[2rem] border border-line-soft bg-canvas-soft px-6 py-10 text-center shadow-[0_14px_35px_rgba(61,45,43,0.05)]"
        >
          <span
            aria-hidden
            data-testid={`recommended-${kind}-icon`}
            className="flex size-20 items-center justify-center rounded-full bg-primary-soft text-primary"
          >
            <Icon className="size-9" />
          </span>
          <h3 className="mt-5 font-display text-xl font-bold text-ink sm:text-2xl">
            {t(`recommended.${kind}Title`)}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted sm:text-base">
            {t(`recommended.${kind}Description`)}
          </p>
          {isError ? (
            <button
              type="button"
              onClick={onRetry}
              className="motion-press mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
            >
              {t("recommended.retry")}
            </button>
          ) : null}
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
        className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-3xl"
      >
        {t("recommended.title")}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
        {t("recommended.description")}
      </p>
    </div>
  );
}
