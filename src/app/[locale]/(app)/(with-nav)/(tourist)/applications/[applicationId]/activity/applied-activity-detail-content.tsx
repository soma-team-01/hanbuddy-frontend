"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ActivityDetailView } from "@/components/activity/ActivityDetailView";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import { getLocaleOrDefault } from "@/i18n/routing";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { formatSeoulDateWithWeekday, formatSeoulTime } from "@/lib/datetime";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { appliedActivityDetailQueryOptions } from "@/lib/query/applications";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function AppliedActivityDetailContent({
  applicationId,
}: Readonly<{ applicationId: string }>) {
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const displayCurrency = getDefaultDisplayCurrency(locale);
  const t = useTranslations("AppliedActivityDetail");
  const tActivity = useTranslations("ActivityDetail");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const detailQuery = useQuery(
    appliedActivityDetailQueryOptions(applicationId, language, displayCurrency),
  );
  useAuthQueryRedirect(detailQuery.error);

  const activity = detailQuery.data
    ? mapTouristActivityDetailToActivity(
        detailQuery.data.activity,
        tErrors("dateTimeUnavailable"),
        locale,
        tActivity("localHost"),
      )
    : null;

  if (detailQuery.isPending) {
    return <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>;
  }

  if (detailQuery.error || !detailQuery.data || !activity) {
    return (
      <PageContainer className="py-6 md:py-10">
        <div className="mx-auto flex w-full max-w-[840px] flex-col items-start gap-4">
          <p
            role="alert"
            className="w-full rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {detailQuery.error
              ? getApiErrorMessage(detailQuery.error, t("loadError"))
              : t("loadError")}
          </p>
          <Link
            href="/applications"
            className="font-display text-sm font-bold text-primary underline underline-offset-4"
          >
            {t("backToApplications")}
          </Link>
        </div>
      </PageContainer>
    );
  }

  const { activityStatus, canBook, startAt, endAt } = detailQuery.data;
  const date = formatSeoulDateWithWeekday(startAt, locale) ?? tErrors("dateTimeUnavailable");
  const startTime = formatSeoulTime(startAt, locale) ?? tErrors("dateTimeUnavailable");
  const endTime = formatSeoulTime(endAt, locale) ?? tErrors("dateTimeUnavailable");
  const showBookingBar = activityStatus === "ACTIVE" && canBook;
  const availabilityMessage =
    activityStatus === "INACTIVE" || activityStatus === "DELETED"
      ? t("notAcceptingBookings")
      : !canBook
        ? t("noAvailableSchedules")
        : null;

  return (
    <div className="flex flex-1 flex-col pb-6">
      <PageContainer className="pt-2 md:pt-6">
        <section className="mx-auto flex w-full max-w-[840px] flex-col gap-2 rounded-2xl border border-line-soft bg-canvas-soft px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.12em] text-primary uppercase">
              {t("appliedSchedule")}
            </p>
            <p className="mt-1 font-display text-base font-bold text-ink">
              {date} · {startTime}–{endTime}
            </p>
          </div>
          {availabilityMessage ? (
            <p className="text-sm font-semibold text-muted">{availabilityMessage}</p>
          ) : null}
        </section>
      </PageContainer>
      <ActivityDetailView activity={activity} showBookingBar={showBookingBar} />
    </div>
  );
}
