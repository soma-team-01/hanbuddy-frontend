"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { activityWeatherQueryOptions, touristActivityQueryOptions } from "@/lib/query/activities";
import { useHistoryBack } from "@/lib/navigation/use-history-back";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { useDisplayCurrency } from "@/lib/display-currency-context";

export function ActivityDetailContent({ activityId }: Readonly<{ activityId: string }>) {
  const locale = useLocale();
  const language = getContentLanguage(locale);
  const { displayCurrency } = useDisplayCurrency();
  const activityQuery = useQuery(
    touristActivityQueryOptions(activityId, language, displayCurrency),
  );
  const weatherQuery = useQuery({
    ...activityWeatherQueryOptions(activityId),
    enabled: activityQuery.isSuccess,
  });
  const t = useTranslations("ActivityDetail");
  const tExplore = useTranslations("Explore");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  // 탐색·내 신청 등 어디서 들어왔는지에 따라 이전 화면으로 돌아간다
  const goBack = useHistoryBack("/explore");
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(
        activityQuery.data,
        tErrors("dateTimeUnavailable"),
        locale,
        t("localHost"),
      )
    : null;
  const hasCurrencyFallback =
    activityQuery.data !== undefined &&
    (activityQuery.data.displayPrice?.currency ?? "KRW") !== displayCurrency;

  if (activityQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader onLeftClick={goBack} />
        <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>
      </div>
    );
  }

  if (activityQuery.error || !activity) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader onLeftClick={goBack} />
        <PageContainer className="py-6 md:py-10">
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {activityQuery.error
              ? getApiErrorMessage(activityQuery.error, t("loadError"))
              : t("notFound")}
          </p>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-32">
      <PageHeader onLeftClick={goBack} />
      {hasCurrencyFallback ? (
        <PageContainer className="pt-4">
          <p role="status" className="text-sm text-muted">
            {tExplore("currencyFallback", {
              currency: activity.priceCurrency ?? "KRW",
            })}
          </p>
        </PageContainer>
      ) : null}
      <ActivityDetailView
        activity={activity}
        weather={weatherQuery.data?.available ? weatherQuery.data : undefined}
      />
    </div>
  );
}
