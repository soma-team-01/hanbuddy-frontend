"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { BookingForm } from "./booking-form";

export function BookingContent({ activityId }: Readonly<{ activityId: string }>) {
  const activityQuery = useQuery(touristActivityQueryOptions(activityId));
  const locale = useLocale();
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

  return <BookingForm activity={activity} />;
}
