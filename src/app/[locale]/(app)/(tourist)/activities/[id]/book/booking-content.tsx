"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import { BookingForm } from "./booking-form";

export function BookingContent({ activityId }: Readonly<{ activityId: string }>) {
  const activityQuery = useQuery(touristActivityQueryOptions(activityId));
  const tErrors = useTranslations("Errors");
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(activityQuery.data, tErrors("dateTimeUnavailable"))
    : null;

  if (activityQuery.isPending) {
    return <p className="px-4 py-10 text-center text-ink-soft">Loading booking...</p>;
  }

  if (activityQuery.error || !activity) {
    return (
      <main className="px-4 py-6">
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {activityQuery.error?.message || "예약 정보를 불러오지 못했습니다."}
        </p>
      </main>
    );
  }

  return <BookingForm activity={activity} />;
}
