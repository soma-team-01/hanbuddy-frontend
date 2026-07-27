"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BookingPanel } from "@/components/layout/BookingPanel";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatKrw } from "@/lib/format";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  getGoogleMapsApiKey,
} from "@/lib/google/places";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

interface GoogleMeetingAddress {
  locale: string;
  placeId: string;
  apiKey: string;
  formattedAddress: string;
}

export function ActivityDetailContent({ activityId }: Readonly<{ activityId: string }>) {
  const activityQuery = useQuery(touristActivityQueryOptions(activityId));
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const [googleMeetingAddress, setGoogleMeetingAddress] = useState<GoogleMeetingAddress | null>(
    null,
  );
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(
        activityQuery.data,
        tErrors("dateTimeUnavailable"),
        locale,
        t("localHost"),
      )
    : null;
  const meetingPlaceId = activity?.meetingPoint.placeId ?? "";
  const googleMapsApiKey = getGoogleMapsApiKey();

  useEffect(() => {
    if (!meetingPlaceId || !googleMapsApiKey) {
      let isMounted = true;
      queueMicrotask(() => {
        if (isMounted) setGoogleMeetingAddress(null);
      });

      return () => {
        isMounted = false;
      };
    }

    let isMounted = true;

    fetchGooglePlaceDetails(meetingPlaceId, googleMapsApiKey, { locale })
      .then((place) => {
        if (!isMounted) return;
        setGoogleMeetingAddress({
          locale,
          placeId: meetingPlaceId,
          apiKey: googleMapsApiKey,
          formattedAddress: place.formattedAddress,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setGoogleMeetingAddress(null);
      });

    return () => {
      isMounted = false;
    };
  }, [googleMapsApiKey, locale, meetingPlaceId]);

  if (activityQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/explore" />
        <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>
      </div>
    );
  }

  if (activityQuery.error || !activity) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader backHref="/explore" />
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

  const meetingAddress =
    googleMeetingAddress?.locale === locale &&
    googleMeetingAddress.placeId === meetingPlaceId &&
    googleMeetingAddress.apiKey === googleMapsApiKey
      ? googleMeetingAddress.formattedAddress
      : "";
  const googleMapsUrl = activity.meetingPoint.placeId
    ? buildGoogleMapsEmbedUrl(activity.meetingPoint.placeId, googleMapsApiKey, locale)
    : "";

  let meetingMapMedia: React.ReactNode = (
    <div className="mt-3 flex h-[204px] w-full items-center justify-center rounded-xl bg-line-soft/60 text-sm text-muted">
      {t("mapUnavailable")}
    </div>
  );
  if (googleMapsUrl) {
    meetingMapMedia = (
      <iframe
        title={t("mapTitle", { place: activity.meetingPoint.name })}
        src={googleMapsUrl}
        className="mt-3 h-[204px] w-full rounded-xl border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  } else if (activity.meetingPoint.mapImageUrl) {
    meetingMapMedia = (
      <div className="relative mt-3 h-[204px] w-full overflow-hidden rounded-xl">
        <Image
          src={activity.meetingPoint.mapImageUrl}
          alt={t("mapTitle", { place: activity.meetingPoint.name })}
          fill
          sizes="(max-width: 448px) 100vw, 448px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pb-28 lg:pb-0">
      <PageHeader backHref="/explore" />
      <PageContainer className="py-6 md:py-10">
        <main
          data-testid="activity-detail-layout"
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        >
          <article className="overflow-hidden rounded-2xl border border-line-soft bg-panel shadow-sm">
            <div className="relative aspect-[16/10] w-full md:aspect-[16/9]">
              <Image
                src={activity.heroImageUrl}
                alt={activity.title}
                fill
                sizes="(max-width: 1023px) 100vw, 800px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col gap-10 p-5 md:p-8">
              <section className="flex flex-col gap-2">
                <h1 className="font-display text-3xl leading-tight font-bold tracking-tight text-ink md:text-4xl">
                  {activity.title}
                </h1>
                <p className="text-muted">{activity.description}</p>
                <p className="pt-1 text-xs font-medium text-muted">
                  {activity.categoryLabel
                    ? `${activity.district} · ${activity.categoryLabel}`
                    : activity.district}
                </p>
              </section>

              <section className="flex flex-col gap-4 border-t border-line-soft pt-6 md:grid md:grid-cols-2">
                <div className="flex items-center gap-4">
                  <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={48} />
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink">
                      {t("host", { name: activity.host.name })}
                    </h3>
                    <p className="text-xs text-muted">{activity.host.bio}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-primary-soft">
                    <MapPinIcon className="size-5 text-primary-strong" />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold text-ink">
                      {activity.meetingPoint.name}
                    </h3>
                    {meetingAddress ? <p className="text-xs text-muted">{meetingAddress}</p> : null}
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4 border-t border-line-soft pt-6">
                <h3 className="font-display text-lg font-bold text-ink">{t("included")}</h3>
                <ul className="flex flex-col gap-2">
                  {activity.included.map(({ label, provided }) => (
                    <li key={label} className="flex items-start gap-2 text-xs font-medium">
                      {provided ? (
                        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                      ) : (
                        <XIcon className="mt-0.5 size-3.5 shrink-0 text-danger" />
                      )}
                      <span className={provided ? "text-ink" : "text-muted"}>{label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-4 border-t border-line-soft pt-6">
                <h3 className="font-display text-lg font-bold text-ink">{t("cannotJoin")}</h3>
                <ul className="flex list-inside list-disc flex-col gap-2 text-xs font-medium text-ink">
                  {activity.restrictions.map((restriction) => (
                    <li key={restriction}>{restriction}</li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-4 border-t border-line-soft pt-6">
                <h2 className="font-display text-xl font-bold text-ink">{t("availability")}</h2>
                <p className="text-xs text-muted">{t("kstNotice")}</p>
                <div className="flex scrollbar-none gap-4 overflow-x-auto pb-2">
                  {activity.sessions.map((session) => (
                    <div
                      key={session.id}
                      className="w-64 shrink-0 rounded-xl border border-line-soft bg-panel-raised p-4"
                    >
                      <p className="font-display text-sm font-bold text-ink">{session.dateLabel}</p>
                      <p className="mt-1 text-xs text-muted">{session.timeLabel}</p>
                      <p className="mt-3 text-xs font-medium text-ink">
                        {t("remaining", { count: session.spotsLeft })}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-1 border-t border-line-soft pt-6">
                <h2 className="font-display text-xl font-bold text-ink">{t("meetingPoint")}</h2>
                <p className="mt-3 font-display text-sm font-bold text-ink">
                  {activity.meetingPoint.name}
                </p>
                {meetingAddress ? <p className="text-xs text-muted">{meetingAddress}</p> : null}
                {meetingMapMedia}
              </section>
            </div>
          </article>
          <BookingPanel>
            <BottomActionBar>
              <div className="flex flex-1 flex-col">
                {activity.originalPrice && (
                  <span className="text-sm text-muted line-through">
                    {formatKrw(activity.originalPrice, locale)}
                  </span>
                )}
                <span className="font-display text-xl font-bold text-primary-strong">
                  {t("perPerson", { price: formatKrw(activity.price, locale) })}
                </span>
              </div>
              <Link
                href={`/activities/${activity.id}/book`}
                className="flex h-11 items-center justify-center rounded-xl bg-primary px-8 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                {t("bookNow")}
              </Link>
            </BottomActionBar>
          </BookingPanel>
        </main>
      </PageContainer>
    </div>
  );
}
