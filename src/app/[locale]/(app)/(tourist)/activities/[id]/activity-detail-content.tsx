"use client";

import type { TouristActivityDetail } from "@/types/activity";
import type { ReviewPageResponse } from "@/types/review";
import { useAnalyticsView, useFunnelEvent } from "@/components/analytics/AnalyticsProvider";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { ActivityContact } from "@/components/activity/ActivityContact";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { getLocaleOrDefault } from "@/i18n/routing";
import { activityWeatherQueryOptions, touristActivityQueryOptions } from "@/lib/query/activities";
import { useHistoryBack } from "@/lib/navigation/use-history-back";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { useSessionRole } from "@/lib/auth/session-role-context";
import { activityBreadcrumbs } from "@/lib/seo/activity-breadcrumbs";

export function ActivityDetailContent({
  activityId,
  initialActivity,
  initialReviews,
  preferredDate,
  emailLoginEnabled = false,
}: Readonly<{
  activityId: string;
  initialActivity?: TouristActivityDetail;
  initialReviews?: ReviewPageResponse | Promise<ReviewPageResponse | undefined>;
  preferredDate?: string;
  emailLoginEnabled?: boolean;
}>) {
  const track = useFunnelEvent();
  // 서버 쿠키 기준 로그인 여부. 비로그인이면 예약 화면 대신 로그인 팝업을 띄운다
  const isGuest = useSessionRole() === null;
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const activityQuery = useQuery({
    ...touristActivityQueryOptions(activityId, language, getDefaultDisplayCurrency(locale)),
    initialData: initialActivity,
  });
  const weatherQuery = useQuery({
    ...activityWeatherQueryOptions(activityId),
    enabled: activityQuery.isSuccess,
  });
  const t = useTranslations("ActivityDetail");
  const tNavigation = useTranslations("Navigation");
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

  // 번역 개선 효과를 언어별로 나눠 보기 위해 실제로 번역본을 노출했는지 함께 보낸다
  useAnalyticsView(
    "view_item",
    Number(activityId),
    activityQuery.isSuccess && Boolean(activity) && !activityQuery.error,
    { isTranslated: activity?.isTranslated },
  );

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
    <div className="flex flex-1 flex-col pb-6">
      <PageHeader onLeftClick={goBack} />
      {/* 위치 표시는 뒤로가기 줄 바로 아래에 두고, 데스크톱은 사진 위 여백과 겹쳐 사진 위치를 거의 바꾸지 않는다. */}
      <PageContainer className="pt-1 md:-mb-6 md:pt-0">
        <Breadcrumbs
          items={activityBreadcrumbs(activity, (key) => tNavigation(key))}
          label={tNavigation("breadcrumb")}
          className="mx-auto max-w-[840px]"
        />
      </PageContainer>
      <ActivityDetailView
        activity={activity}
        preferredDate={preferredDate}
        loginRequired={isGuest}
        emailLoginEnabled={emailLoginEnabled}
        initialReviews={initialReviews}
        onBookingClick={() =>
          track("booking_cta_click", Number(activityId), {
            isTranslated: activity.isTranslated,
          })
        }
        weather={weatherQuery.data?.available ? weatherQuery.data : undefined}
      />
      <ActivityContact />
    </div>
  );
}
