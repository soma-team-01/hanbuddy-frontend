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
import { isActivitySearchDate, withActivityDate } from "@/lib/activity-booking-window";
import type { TouristActivitySummary } from "@/types/activity";

const RECOMMENDED_LIMIT = 4;

export function RecommendedExperiences({
  date,
  initialActivities,
}: Readonly<{
  date?: string;
  /** 서버가 첫 HTML에 넣은 목록. 없으면(서버 조회 실패) 브라우저가 지금처럼 불러온다 */
  initialActivities?: TouristActivitySummary[];
}> = {}) {
  const invalid = Boolean(date) && !isActivitySearchDate(date!);
  return invalid ? (
    <section className="border-t border-line-soft bg-canvas-soft py-10 md:py-16">
      <PageContainer>
        <RecommendedHeading />
      </PageContainer>
    </section>
  ) : (
    <RecommendedResults date={date} initialActivities={initialActivities} />
  );
}

function RecommendedResults({
  date,
  initialActivities,
}: Readonly<{ date?: string; initialActivities?: TouristActivitySummary[] }>) {
  const t = useTranslations("Landing");
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const activitiesQuery = useQuery({
    ...touristActivitiesQueryOptions(language, getDefaultDisplayCurrency(locale), date),
    initialData: initialActivities,
  });

  if (activitiesQuery.isPending) {
    return (
      <section
        data-landing-section="recommended_experiences"
        data-landing-position="2"
        aria-labelledby="recommended-title"
        className="border-t border-line-soft bg-canvas-soft py-10 md:py-16"
      >
        <PageContainer>
          <RecommendedHeading />
          <p className="sr-only">{t("recommended.loading")}</p>
          <div
            data-testid="recommended-track"
            className="recommended-track -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:scroll-px-6 md:gap-4 md:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
          >
            {Array.from({ length: RECOMMENDED_LIMIT }, (_, index) => (
              <div
                key={index}
                className="flex w-[44vw] max-w-[220px] shrink-0 snap-start flex-col gap-2.5 md:w-[30vw] md:max-w-[260px] lg:w-auto lg:max-w-none"
              >
                <div className="aspect-square w-full animate-pulse rounded-2xl bg-panel-raised" />
                <div className="flex flex-col gap-2">
                  <div className="h-4 w-3/4 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-panel-raised" />
                  <div className="h-4 w-2/3 animate-pulse rounded-full bg-panel-raised" />
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
      data-landing-section="recommended_experiences"
      data-landing-position="2"
      aria-labelledby="recommended-title"
      className="border-t border-line-soft bg-canvas-soft py-10 md:py-16"
    >
      <PageContainer>
        <RecommendedHeading />
        <div className="mt-4 flex justify-end">
          <Link
            href={withActivityDate("/explore", date)}
            className="inline-flex min-h-11 items-center self-start font-display text-sm font-bold text-primary transition-colors hover:text-primary-hover"
          >
            {t("recommended.viewAll")}
            <span aria-hidden className="ml-2 text-base">
              →
            </span>
          </Link>
        </div>

        {/* Airbnb 체험처럼 태블릿까지는 다음 카드가 살짝 보이는 스냅 가로 스와이프, lg 이상은 4열 그리드 */}
        <div
          data-testid="recommended-track"
          className="recommended-track -mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pb-2 md:-mx-6 md:scroll-px-6 md:gap-4 md:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
        >
          {activities.map((activity, index) => (
            <Link
              key={activity.id}
              href={withActivityDate(`/activities/${activity.id}`, date)}
              className="motion-reveal motion-press block w-[44vw] max-w-[220px] shrink-0 snap-start rounded-2xl md:w-[30vw] md:max-w-[260px] lg:w-auto lg:max-w-none"
              style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
            >
              <ActivityCard activity={activity} variant="tile" eagerImage={index === 0} />
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
      data-landing-section="recommended_experiences"
      data-landing-position="2"
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
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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
    </div>
  );
}
