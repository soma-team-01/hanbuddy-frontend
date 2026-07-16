"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Avatar } from "@/components/ui/Avatar";
import { CheckIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { formatKrw } from "@/lib/format";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  getGoogleMapsApiKey,
} from "@/lib/google/places";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

export function ActivityDetailContent({ activityId }: Readonly<{ activityId: string }>) {
  const activityQuery = useQuery(touristActivityQueryOptions(activityId));
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tErrors = useTranslations("Errors");
  const [googleMeetingAddress, setGoogleMeetingAddress] = useState("");
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(
        activityQuery.data,
        tErrors("dateTimeUnavailable"),
        locale,
        t("localHost"),
      )
    : null;

  useEffect(() => {
    const placeId = activity?.meetingPoint.placeId;
    const apiKey = getGoogleMapsApiKey();
    if (!placeId || !apiKey) return;

    let isMounted = true;

    fetchGooglePlaceDetails(placeId, apiKey, { locale })
      .then((place) => {
        if (!isMounted) return;
        setGoogleMeetingAddress(place.formattedAddress);
      })
      .catch(() => {
        if (!isMounted) return;
        setGoogleMeetingAddress("");
      });

    return () => {
      isMounted = false;
    };
  }, [activity?.meetingPoint.placeId, locale]);

  if (activityQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <TopAppBar backHref="/explore" />
        <p className="px-4 py-10 text-center text-ink-soft">{t("loading")}</p>
      </div>
    );
  }

  if (activityQuery.error || !activity) {
    return (
      <div className="flex flex-1 flex-col">
        <TopAppBar backHref="/explore" />
        <main className="px-4 py-6">
          <p
            role="alert"
            className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          >
            {activityQuery.error ? t("loadError") : t("notFound")}
          </p>
        </main>
      </div>
    );
  }

  const meetingAddress = googleMeetingAddress;
  const googleMapsUrl = activity.meetingPoint.placeId
    ? buildGoogleMapsEmbedUrl(activity.meetingPoint.placeId, getGoogleMapsApiKey(), locale)
    : "";

  let meetingMapMedia: React.ReactNode = (
    <div className="mt-3 flex h-[204px] w-full items-center justify-center rounded-xl bg-line/60 text-sm text-ink-soft">
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
    <div className="flex flex-1 flex-col pb-28">
      <TopAppBar backHref="/explore" />
      <main className="flex flex-1 flex-col">
        <div className="relative h-[300px] w-full">
          <Image
            src={activity.heroImageUrl}
            alt={activity.title}
            fill
            sizes="(max-width: 448px) 100vw, 448px"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex flex-col gap-10 px-4 py-6">
          <section className="flex flex-col gap-2 text-center">
            <h1 className="font-display text-[28px] leading-9 font-semibold tracking-tight text-forest">
              {activity.title}
            </h1>
            <p className="text-ink-soft">{activity.description}</p>
            <p className="pt-1 text-xs font-medium text-ink-soft">
              {activity.categoryLabel
                ? `${activity.district} · ${activity.categoryLabel}`
                : activity.district}
            </p>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <div className="flex items-center gap-4">
              <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={48} />
              <div>
                <h3 className="font-display text-sm font-semibold text-forest">
                  {t("host", { name: activity.host.name })}
                </h3>
                <p className="text-xs text-ink-soft">{activity.host.bio}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-lg bg-sand">
                <MapPinIcon className="size-5 text-forest" />
              </span>
              <div>
                <h3 className="font-display text-sm font-semibold text-forest">
                  {activity.meetingPoint.name}
                </h3>
                {meetingAddress ? <p className="text-xs text-ink-soft">{meetingAddress}</p> : null}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h3 className="font-display text-sm font-semibold text-forest">{t("included")}</h3>
            <ul className="flex flex-col gap-2">
              {activity.included.map(({ label, provided }) => (
                <li key={label} className="flex items-start gap-2 text-xs font-medium">
                  {provided ? (
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                  ) : (
                    <XIcon className="mt-0.5 size-3.5 shrink-0 text-danger" />
                  )}
                  <span className={provided ? "text-ink" : "text-ink-soft"}>{label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h3 className="font-display text-sm font-semibold text-forest">{t("cannotJoin")}</h3>
            <ul className="flex list-inside list-disc flex-col gap-2 text-xs font-medium text-ink">
              {activity.restrictions.map((restriction) => (
                <li key={restriction}>{restriction}</li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-4 border-t border-line pt-6">
            <h2 className="font-display text-xl font-semibold text-forest">{t("availability")}</h2>
            <p className="text-xs text-ink-soft">{t("kstNotice")}</p>
            <div className="-mx-4 flex scrollbar-none gap-4 overflow-x-auto px-4 pb-2">
              {activity.sessions.map((session) => (
                <div
                  key={session.id}
                  className="w-64 shrink-0 rounded-xl border border-line bg-white p-4 shadow-[0_1px_1px_0_rgba(0,0,0,0.05)]"
                >
                  <p className="font-display text-sm font-semibold text-forest">
                    {session.dateLabel}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">{session.timeLabel}</p>
                  <p className="mt-3 text-xs font-medium text-ink">
                    {t("remaining", { count: session.spotsLeft })}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-1 border-t border-line pt-6">
            <h2 className="font-display text-xl font-semibold text-forest">{t("meetingPoint")}</h2>
            <p className="mt-3 font-display text-sm font-semibold text-forest">
              {activity.meetingPoint.name}
            </p>
            {meetingAddress ? <p className="text-xs text-ink-soft">{meetingAddress}</p> : null}
            {meetingMapMedia}
          </section>
        </div>
      </main>
      <BottomActionBar>
        <div className="flex flex-1 flex-col">
          {activity.originalPrice && (
            <span className="text-sm text-ink-soft line-through">
              {formatKrw(activity.originalPrice, locale)}
            </span>
          )}
          <span className="font-display text-xl font-bold text-forest">
            {t("perPerson", { price: formatKrw(activity.price, locale) })}
          </span>
        </div>
        <Link
          href={`/activities/${activity.id}/book`}
          className="flex h-11 items-center justify-center rounded-xl bg-forest px-8 font-display text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          {t("bookNow")}
        </Link>
      </BottomActionBar>
    </div>
  );
}
