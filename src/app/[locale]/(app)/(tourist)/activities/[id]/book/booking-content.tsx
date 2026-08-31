"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { BookingForm } from "./booking-form";

export function BookingContent({
  activityId,
  initialScheduleId,
}: Readonly<{ activityId: string; initialScheduleId?: string }>) {
  const locale = useLocale();
  const language = getContentLanguage(locale);
  // 원화 계약 가격과 함께 PayPal 결제 예정 금액을 안내할 USD 참고 가격을 받는다.
  const activityQuery = useQuery(touristActivityQueryOptions(activityId, language, "USD"));
  const t = useTranslations("Booking");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(activityQuery.data, tErrors("dateTimeUnavailable"), locale)
    : null;

  if (activityQuery.isPending) {
    return <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>;
  }

  if (activityQuery.error || !activity) {
    return (
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
    );
  }

  return <BookingForm activity={activity} initialSessionId={initialScheduleId} />;
}
