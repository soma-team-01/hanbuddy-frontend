"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  AvailabilityCalendarDialog,
  formatSessionTimeRange,
} from "@/components/activity/AvailabilityCalendarDialog";
import { HostProfileDialog } from "@/components/activity/HostProfileDialog";
import { PhotoGalleryDialog } from "@/components/activity/PhotoGalleryDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityReviewsSection } from "@/components/review/ActivityReviewsSection";
import { Avatar } from "@/components/ui/Avatar";
import { CalendarDaysIcon, CheckIcon, ClockIcon, MapPinIcon, XIcon } from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { Link } from "@/i18n/navigation";
import { formatSeoulDateWithWeekday } from "@/lib/datetime";
import { formatKrw } from "@/lib/format";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  getGoogleMapsApiKey,
} from "@/lib/google/places";
import type { Activity } from "@/types/activity";

const SECTION_IDS = {
  aboutHost: "about-host",
  meetingPoint: "meeting-point",
  itinerary: "what-youll-do",
  reviews: "reviews",
} as const;

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface GoogleMeetingAddress {
  locale: string;
  placeId: string;
  apiKey: string;
  formattedAddress: string;
}

/**
 * 게스트에게 보이는 활동 상세 본문 + 하단 예약 바 + 일정 캘린더.
 * preview면(버디 미리보기·등록 검토) 화면은 동일하되 예약 단계로 이동할 수 없다.
 */
export function ActivityDetailView({
  activity,
  preview = false,
  bottomBar = "fixed",
  unoptimizedImages = false,
}: Readonly<{
  activity: Activity;
  preview?: boolean;
  /** inline이면 하단 바를 고정하지 않고 본문 아래 카드로 렌더링한다 (위저드 검토 화면용) */
  bottomBar?: "fixed" | "inline";
  /** blob 미리보기처럼 next/image 최적화가 불가능한 소스일 때 */
  unoptimizedImages?: boolean;
}>) {
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tExplore = useTranslations("Explore");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const [googleMeetingAddress, setGoogleMeetingAddress] = useState<GoogleMeetingAddress | null>(
    null,
  );
  const meetingPlaceId = activity.meetingPoint.placeId ?? "";
  const googleMapsApiKey = getGoogleMapsApiKey();
  // 위저드 검토 화면은 아직 저장되지 않은 초안이라 조회할 후기가 없다
  const showReviews = /^\d+$/.test(activity.id);

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

  const meetingAddress =
    googleMeetingAddress?.locale === locale &&
    googleMeetingAddress.placeId === meetingPlaceId &&
    googleMeetingAddress.apiKey === googleMapsApiKey
      ? googleMeetingAddress.formattedAddress
      : "";
  const googleMapsUrl = activity.meetingPoint.placeId
    ? buildGoogleMapsEmbedUrl(activity.meetingPoint.placeId, googleMapsApiKey, locale)
    : "";
  const hasDiscount =
    activity.originalPrice !== undefined && activity.originalPrice > activity.price;
  const totalDurationLabel =
    activity.durationMinutes !== undefined
      ? activity.durationMinutes < 60
        ? tExplore("durationMinutes", { minutes: activity.durationMinutes })
        : tExplore("durationHours", { hours: activity.durationMinutes / 60 })
      : "";
  const itinerary = activity.itinerary ?? [];
  const galleryImages = useMemo(
    () => (activity.images?.length ? activity.images : [activity.heroImageUrl]),
    [activity.images, activity.heroImageUrl],
  );
  const extraPhotoCount = galleryImages.length - 3;
  const bookableSessions = useMemo(
    () => activity.sessions.filter((session) => session.spotsLeft > 0),
    [activity.sessions],
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const selectedSession =
    bookableSessions.find((session) => session.id === selectedSessionId) ?? null;

  let dateBoxLabel = t("selectDatePlaceholder");
  if (selectedSession) {
    const timeRange = formatSessionTimeRange(selectedSession, activity.durationMinutes, locale);
    const dateWithWeekday = selectedSession.startAt
      ? formatSeoulDateWithWeekday(selectedSession.startAt, locale)
      : null;
    dateBoxLabel = `${dateWithWeekday ?? selectedSession.dateLabel} ${timeRange}`;
  } else if (activity.sessions.length === 0) {
    dateBoxLabel = t("noDates");
  } else if (bookableSessions.length === 0) {
    dateBoxLabel = tExplore("soldOut");
  }
  const dateBoxDisabled = bookableSessions.length === 0;

  function handleCalendarSelect(sessionId: string) {
    setSelectedSessionId(sessionId);
    setCalendarOpen(false);
  }

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
          unoptimized={unoptimizedImages}
          className="object-cover"
        />
      </div>
    );
  }

  const bottomBarContent = (
    <div className="mx-auto flex w-full max-w-[840px] items-center gap-4">
      <button
        type="button"
        data-testid="date-select-box"
        onClick={() => setCalendarOpen(true)}
        disabled={dateBoxDisabled}
        className={`flex h-12 min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-line-strong bg-canvas-soft px-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          selectedSession
            ? "text-ink enabled:hover:border-ink"
            : "text-muted enabled:hover:border-ink enabled:hover:text-ink"
        }`}
      >
        <span className="truncate text-sm font-semibold">{dateBoxLabel}</span>
        <CalendarDaysIcon className="size-5 shrink-0 text-primary" />
      </button>
      <div className="flex shrink-0 flex-col items-end">
        {hasDiscount ? (
          <span className="text-sm text-muted line-through">
            {formatKrw(activity.originalPrice ?? activity.price, locale)}
          </span>
        ) : null}
        <span className="font-display text-xl font-bold text-primary">
          {t("perPerson", { price: formatKrw(activity.price, locale) })}
        </span>
      </div>
      {preview || !selectedSession ? (
        <button
          type="button"
          disabled
          className="flex h-12 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-primary px-5 font-display text-sm font-bold text-on-primary opacity-60 sm:px-8"
        >
          {t("bookNow")}
        </button>
      ) : (
        <Link
          href={`/activities/${activity.id}/book?scheduleId=${selectedSession.id}`}
          className="flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-5 font-display text-sm font-bold text-on-primary shadow-[0_10px_22px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover sm:px-8"
        >
          {t("bookNow")}
        </Link>
      )}
    </div>
  );

  return (
    <>
      <PageContainer className="py-6 md:py-10">
        <main data-testid="activity-detail-layout" className="mx-auto w-full max-w-[840px]">
          <article className="min-w-0">
            <div className="relative grid h-[320px] grid-cols-2 gap-2 overflow-hidden rounded-3xl md:h-[420px] md:grid-cols-[1.4fr_0.6fr]">
              <button
                type="button"
                aria-label={t("viewPhoto", { number: 1 })}
                onClick={() => setGalleryIndex(0)}
                className="relative row-span-2 min-h-0 cursor-zoom-in"
              >
                <Image
                  src={activity.heroImageUrl}
                  alt={activity.title}
                  fill
                  loading="eager"
                  sizes="(max-width: 1023px) 70vw, 560px"
                  unoptimized={unoptimizedImages}
                  className="object-cover"
                />
              </button>
              <button
                type="button"
                aria-label={t("viewPhoto", { number: 2 })}
                onClick={() => setGalleryIndex(galleryImages[1] ? 1 : 0)}
                className="relative hidden min-h-0 cursor-zoom-in bg-panel md:block"
              >
                {galleryImages[1] ? (
                  <Image
                    src={galleryImages[1]}
                    alt=""
                    fill
                    sizes="280px"
                    unoptimized={unoptimizedImages}
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 bg-panel-raised" />
                )}
              </button>
              <button
                type="button"
                aria-label={t("viewPhoto", { number: 3 })}
                onClick={() => setGalleryIndex(galleryImages[2] ? 2 : 0)}
                className="relative hidden min-h-0 cursor-zoom-in bg-panel md:block"
              >
                {galleryImages[2] ? (
                  <Image
                    src={galleryImages[2]}
                    alt=""
                    fill
                    sizes="280px"
                    unoptimized={unoptimizedImages}
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 bg-panel" />
                )}
                {extraPhotoCount > 0 ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/45 font-display text-2xl font-bold text-white">
                    {t("morePhotos", { count: extraPhotoCount })}
                  </span>
                ) : null}
              </button>
              {activity.isSoldOut ? (
                <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-ink/80 px-3 py-1.5 font-display text-xs font-bold text-white backdrop-blur-[2px]">
                  {tExplore("soldOut")}
                </span>
              ) : hasDiscount && activity.discountPercent ? (
                <span className="pointer-events-none absolute top-4 left-4 rounded-full bg-primary px-3 py-1.5 font-display text-xs font-bold text-on-primary shadow-[0_6px_16px_rgba(209,63,50,0.35)]">
                  {tExplore("discountBadge", { percent: activity.discountPercent })}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-10 py-8 md:py-10">
              <section className="flex flex-col gap-3">
                <p className="font-display text-xs font-bold tracking-[0.14em] text-primary uppercase">
                  {activity.categoryLabel
                    ? `${activity.district} · ${activity.categoryLabel}`
                    : activity.district}
                </p>
                <h1 className="font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink md:text-5xl">
                  {activity.title}
                </h1>
                {activity.rating !== undefined ? (
                  showReviews ? (
                    <button
                      type="button"
                      onClick={() => scrollToSection(SECTION_IDS.reviews)}
                      className="self-start underline decoration-line-strong decoration-1 underline-offset-4 transition-colors hover:decoration-primary"
                    >
                      <RatingSummary
                        rating={activity.rating}
                        reviewCount={activity.reviewCount}
                        size="md"
                      />
                    </button>
                  ) : (
                    <RatingSummary
                      rating={activity.rating}
                      reviewCount={activity.reviewCount}
                      size="md"
                      className="self-start"
                    />
                  )
                ) : null}
                <p className="max-w-2xl leading-7 text-muted">{activity.description}</p>
              </section>

              <section className="grid gap-4 border-t border-line-soft pt-6 md:grid-cols-2 xl:grid-cols-3">
                <button
                  type="button"
                  onClick={() => scrollToSection(SECTION_IDS.aboutHost)}
                  className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary"
                >
                  <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={48} />
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-ink">
                      {t("host", { name: activity.host.name })}
                    </h3>
                    <p className="text-xs text-muted">{activity.host.bio}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(SECTION_IDS.meetingPoint)}
                  className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-canvas-soft">
                    <MapPinIcon className="size-5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-ink">
                      {activity.meetingPoint.name}
                    </h3>
                    {meetingAddress ? (
                      <p className="truncate text-xs text-muted">{meetingAddress}</p>
                    ) : null}
                  </div>
                </button>
                {totalDurationLabel ? (
                  <button
                    type="button"
                    onClick={() => scrollToSection(SECTION_IDS.itinerary)}
                    className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-canvas-soft">
                      <ClockIcon className="size-5 text-primary" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-ink">{t("duration")}</h3>
                      <p className="text-xs text-muted">{totalDurationLabel}</p>
                    </div>
                  </button>
                ) : null}
              </section>

              {itinerary.length > 0 ? (
                <section
                  id={SECTION_IDS.itinerary}
                  className="flex scroll-mt-24 flex-col gap-6 border-t border-line-soft pt-6"
                >
                  <h2 className="font-display text-xl font-bold text-ink">{t("whatYoullDo")}</h2>
                  <ol className="flex flex-col">
                    {itinerary.map((item, index) => (
                      <li key={item.id} className="flex gap-4 md:gap-5">
                        <div className="flex flex-col items-center">
                          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-line-soft bg-panel md:size-24">
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              fill
                              sizes="96px"
                              unoptimized={unoptimizedImages}
                              className="object-cover"
                            />
                          </div>
                          {index < itinerary.length - 1 ? (
                            <span aria-hidden className="my-2 w-px flex-1 bg-line-strong/60" />
                          ) : null}
                        </div>
                        <div
                          className={`flex min-w-0 flex-col gap-1 pt-1 ${
                            index < itinerary.length - 1 ? "pb-8" : ""
                          }`}
                        >
                          <p className="font-display text-[11px] font-bold tracking-[0.12em] text-primary uppercase">
                            {t("itineraryStep", { number: index + 1 })} ·{" "}
                            {t("itineraryMinutes", { minutes: item.durationMinutes })}
                          </p>
                          <h3 className="font-display text-base font-bold text-ink md:text-lg">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-6 text-muted">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              <section
                id={SECTION_IDS.aboutHost}
                className="flex scroll-mt-24 flex-col gap-4 border-t border-line-soft pt-6"
              >
                <h2 className="font-display text-xl font-bold text-ink">{t("aboutHost")}</h2>
                <div className="flex flex-col gap-4 rounded-3xl border border-line-soft bg-canvas-soft p-5 sm:flex-row sm:gap-5 md:p-6">
                  <button
                    type="button"
                    aria-label={t("viewHostProfile", { name: activity.host.name })}
                    onClick={() => setHostProfileOpen(true)}
                    className="flex shrink-0 items-center gap-4 self-start rounded-full transition-opacity hover:opacity-80 sm:block"
                  >
                    <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={64} />
                    <span className="font-display text-lg font-bold text-primary underline decoration-primary/50 decoration-2 underline-offset-4 sm:hidden">
                      {activity.host.name}
                    </span>
                  </button>
                  <div className="min-w-0">
                    <h3 className="max-sm:hidden">
                      <button
                        type="button"
                        onClick={() => setHostProfileOpen(true)}
                        className="font-display text-lg font-bold text-ink underline decoration-primary/50 decoration-2 underline-offset-4 transition-colors hover:text-primary"
                      >
                        {activity.host.name}
                      </button>
                    </h3>
                    <p className="text-xs font-medium text-muted">{activity.host.bio}</p>
                    {activity.hostIntroduction ? (
                      <p className="mt-3 text-sm leading-7 whitespace-pre-line text-ink">
                        {activity.hostIntroduction}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              {showReviews ? (
                <ActivityReviewsSection activityId={activity.id} id={SECTION_IDS.reviews} />
              ) : null}

              {activity.included.length > 0 || activity.restrictions.length > 0 ? (
                <section className="grid gap-8 border-t border-line-soft pt-6 md:grid-cols-2">
                  {activity.included.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <h3 className="font-display text-lg font-bold text-ink">{t("included")}</h3>
                      <ul className="flex flex-col gap-2.5">
                        {activity.included.map(({ label, provided }) => (
                          <li key={label} className="flex items-start gap-2.5 text-sm font-medium">
                            {provided ? (
                              <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" />
                            ) : (
                              <XIcon className="mt-0.5 size-4 shrink-0 text-danger" />
                            )}
                            <span className={provided ? "text-ink" : "text-muted"}>{label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {activity.restrictions.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      <h3 className="font-display text-lg font-bold text-ink">{t("cannotJoin")}</h3>
                      <ul className="flex flex-col gap-2.5 text-sm font-medium text-ink">
                        {activity.restrictions.map((restriction) => (
                          <li key={restriction} className="flex items-start gap-2.5">
                            <XIcon className="mt-0.5 size-4 shrink-0 text-danger" />
                            <span>{restriction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section
                id={SECTION_IDS.meetingPoint}
                className="flex scroll-mt-24 flex-col gap-1 border-t border-line-soft pt-6"
              >
                <h2 className="font-display text-xl font-bold text-ink">{t("meetingPoint")}</h2>
                <p className="mt-3 font-display text-sm font-bold text-ink">
                  {activity.meetingPoint.name}
                </p>
                {meetingAddress ? <p className="text-xs text-muted">{meetingAddress}</p> : null}
                {meetingMapMedia}
              </section>
            </div>
          </article>

          {bottomBar === "inline" ? (
            <div
              data-testid="booking-bottom-bar"
              className="rounded-2xl border border-line-soft bg-canvas-soft p-4"
            >
              {bottomBarContent}
            </div>
          ) : null}
        </main>
      </PageContainer>

      {bottomBar === "fixed" ? (
        <div
          data-testid="booking-bottom-bar"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-canvas-soft/95 px-4 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] backdrop-blur"
        >
          {bottomBarContent}
        </div>
      ) : null}

      {calendarOpen ? (
        <AvailabilityCalendarDialog
          sessions={activity.sessions}
          selectedSessionId={selectedSessionId}
          durationMinutes={activity.durationMinutes}
          onSelectSession={handleCalendarSelect}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}

      {hostProfileOpen ? (
        <HostProfileDialog
          host={activity.host}
          hostIntroduction={activity.hostIntroduction}
          currentActivityId={activity.id}
          showHostedActivities={!preview}
          onClose={() => setHostProfileOpen(false)}
        />
      ) : null}

      {galleryIndex !== null ? (
        <PhotoGalleryDialog
          images={galleryImages}
          alt={activity.title}
          initialIndex={galleryIndex}
          unoptimizedImages={unoptimizedImages}
          onClose={() => setGalleryIndex(null)}
        />
      ) : null}
    </>
  );
}
