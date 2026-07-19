"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { BookingForm } from "./booking-form";

export function BookingContent({ activityId }: Readonly<{ activityId: string }>) {
  const activityQuery = useQuery(touristActivityQueryOptions(activityId));
  const locale = useLocale();
  const t = useTranslations("Booking");
  const tErrors = useTranslations("Errors");
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(activityQuery.data, tErrors("dateTimeUnavailable"), locale)
    : null;

  if (activityQuery.isPending) {
    return <p className="px-4 py-10 text-center text-ink-soft">{t("loading")}</p>;
  }

  if (activityQuery.error || !activity) {
    return (
      <main className="px-4 py-6">
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {activityQuery.error ? t("loadError") : t("notFound")}
        </p>
      </main>
    );
  }

  return <BookingForm activity={activity} />;
}
