"use client";

import { ActivityLanguages } from "@/components/activity/ActivityLanguages";
import { ActivityPriceTiers } from "@/components/activity/ActivityPriceTiers";
import { LazyMapFrame } from "@/components/activity/LazyMapFrame";
import { SessionWeatherSummary } from "@/components/activity/SessionWeatherSummary";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AvailabilityCalendarDialog,
  formatSessionTimeRange,
} from "@/components/activity/AvailabilityCalendarDialog";
import { HostProfileDialog } from "@/components/activity/HostProfileDialog";
import { LoginPromptDialog } from "@/components/auth/LoginPromptDialog";
import { PhotoGalleryDialog } from "@/components/activity/PhotoGalleryDialog";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityReviewsSection } from "@/components/review/ActivityReviewsSection";
import { Avatar } from "@/components/ui/Avatar";
import {
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  XIcon,
  TranslationIcon,
} from "@/components/ui/icons";
import { RatingSummary } from "@/components/ui/RatingSummary";
import { Link } from "@/i18n/navigation";
import { getIntlLocale } from "@/i18n/routing";
import { formatSeoulDateWithWeekday } from "@/lib/datetime";
import { formatDisplayCurrency, formatKrw } from "@/lib/format";
import { ReferralPrice } from "@/components/referral/ReferralPrice";
import { formatActivityDuration } from "@/lib/activity-duration";
import { useFixedBarHeight } from "@/lib/layout/use-fixed-bar-height";
import {
  buildGoogleMapsEmbedUrl,
  fetchGooglePlaceDetails,
  getGoogleMapsApiKey,
} from "@/lib/google/places";
import type { Activity, ActivityWeatherResult } from "@/types/activity";
import { useBookableSessions } from "@/lib/use-bookable-sessions";
import { isActivityLanguage } from "@/types/activity-language";
import type { ReviewPageResponse } from "@/types/review";

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
  weather,
  onBookingClick,
  preview = false,
  bottomBar = "fixed",
  showBookingBar = true,
  unoptimizedImages = false,
  preferredDate,
  loginRequired = false,
  emailLoginEnabled = false,
  initialReviews,
}: Readonly<{
  activity: Activity;
  onBookingClick?: () => void;
  weather?: ActivityWeatherResult;
  preview?: boolean;
  /** inline이면 하단 바를 고정하지 않고 본문 아래 카드로 렌더링한다 (위저드 검토 화면용) */
  bottomBar?: "fixed" | "inline";
  /** 신청 이력처럼 신규 예약이 불가능한 상세에서는 예약 UI와 고정 바 여백을 모두 제거한다 */
  showBookingBar?: boolean;
  /** blob 미리보기처럼 next/image 최적화가 불가능한 소스일 때 */
  unoptimizedImages?: boolean;
  preferredDate?: string;
  /** 비로그인이면 예약 화면으로 이동하지 않고 그 자리에서 로그인 팝업을 띄운다 */
  loginRequired?: boolean;
  /** 로그인 팝업에 이메일 로그인 링크를 함께 둘지 여부 */
  emailLoginEnabled?: boolean;
  /** 서버에서 미리 받은 후기 미리보기(공개 활동 상세만) */
  initialReviews?: ReviewPageResponse | Promise<ReviewPageResponse | undefined>;
}>) {
  const locale = useLocale();
  const t = useTranslations("ActivityDetail");
  const tReferral = useTranslations("Referral");
  const tExplore = useTranslations("Explore");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [hostProfileOpen, setHostProfileOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const fixedBarRef = useRef<HTMLDivElement>(null);
  useFixedBarHeight(fixedBarRef, showBookingBar && bottomBar === "fixed");
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
  const hasReferencePrice =
    activity.referencePrice !== undefined && activity.referenceCurrency !== undefined;
  const isFreeReferral = activity.activityType === "REFERRAL" && activity.price === 0;
  // 무료는 가격·버튼의 자연스러운 폭만 사용해 날짜 입력을 길게 유지한다.
  const priceSlotClass = isFreeReferral ? "" : hasReferencePrice ? "md:w-60" : "md:w-36";
  const actionSlotClass = isFreeReferral ? "" : "md:min-w-44";
  const estimatedPriceTitle = activity.referencePriceExchangeRateDate
    ? tExplore("estimatedPriceWithDate", { date: activity.referencePriceExchangeRateDate })
    : tExplore("estimatedPrice");
  const totalDurationLabel =
    activity.durationMinutes !== undefined
      ? formatActivityDuration(
          activity.durationMinutes,
          (hours) => tExplore("durationHours", { hours }),
          (minutes) => tExplore("durationMinutes", { minutes }),
        )
      : "";
  const itinerary = activity.itinerary ?? [];
  const galleryImages = useMemo(
    () => (activity.images?.length ? activity.images : [activity.heroImageUrl]),
    [activity.images, activity.heroImageUrl],
  );
  const extraPhotoCount = galleryImages.length - 3;
  const bookableSessions = useBookableSessions(activity.sessions, preview);
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
    dateBoxLabel = t("noDates");
  }
  const dateBoxDisabled = bookableSessions.length === 0;
  let mobileDateLabel = dateBoxLabel;
  if (selectedSession?.startAt && !Number.isNaN(Date.parse(selectedSession.startAt))) {
    const start = new Date(selectedSession.startAt);
    const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    mobileDateLabel = activity.durationMinutes
      ? formatter.formatRange(start, new Date(start.getTime() + activity.durationMinutes * 60_000))
      : formatter.format(start);
  }
  const bookingPath = selectedSession
    ? `/activities/${activity.id}/book?scheduleId=${selectedSession.id}`
    : null;
  const bookNowClassName = `flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-4 font-display text-xs font-bold text-on-primary transition-colors hover:bg-primary-hover md:h-12 md:px-8 md:text-sm ${actionSlotClass}`;
  const bookingLabel = activity.activityType === "REFERRAL" ? tReferral("apply") : t("bookNow");
  const bookingButtonContent = (
    <>
      <span className="md:hidden">
        {activity.activityType === "REFERRAL" ? tReferral("apply") : t("bookCompact")}
      </span>
      <span className="hidden md:inline">{bookingLabel}</span>
    </>
  );

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
      <LazyMapFrame
        title={t("mapTitle", { place: activity.meetingPoint.name })}
        src={googleMapsUrl}
        className="mt-3 h-[204px] w-full rounded-xl border-0"
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

  const dateControl = (
    <button
      type="button"
      data-testid="date-select-box"
      aria-label={dateBoxLabel}
      title={dateBoxLabel}
      onClick={() => setCalendarOpen(true)}
      disabled={dateBoxDisabled}
      className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-1.5 rounded-xl border border-line-strong bg-canvas-soft px-2 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:min-h-12 md:flex-1 md:gap-2 md:px-4 ${
        selectedSession
          ? "text-ink enabled:hover:border-ink"
          : "text-muted enabled:hover:border-ink enabled:hover:text-ink"
      }`}
    >
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-4 font-semibold md:gap-x-3 md:text-sm">
        <span className="md:hidden">{mobileDateLabel}</span>
        <span className="hidden md:inline">{dateBoxLabel}</span>
        <SessionWeatherSummary session={selectedSession} weather={weather} />
      </span>
      <CalendarDaysIcon className="size-4 shrink-0 text-primary md:size-5" />
    </button>
  );
  const bottomBarContent = (
    <div className="mx-auto grid w-full max-w-[840px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 md:flex md:gap-4">
      {dateControl}
      <div data-testid="booking-bar-actions" className="contents">
        {activity.activityType === "REFERRAL" ? (
          <ReferralPrice
            activity={activity}
            variant="detail"
            className={`${priceSlotClass} max-md:max-w-32 max-md:flex-col max-md:items-end md:shrink-0 md:text-right max-md:[&>p]:text-xs max-md:[&>p:first-child]:text-base`}
          />
        ) : (
          <div
            className={`flex min-w-0 flex-col items-end text-right md:shrink-0 ${priceSlotClass}`}
          >
            {hasDiscount ? (
              <span className="text-xs leading-4 text-muted line-through md:text-sm">
                {formatKrw(activity.originalPrice ?? activity.price, locale)}
              </span>
            ) : null}
            <div
              data-testid="booking-bar-price"
              className="flex flex-col items-end md:flex-row md:flex-wrap md:items-baseline md:justify-end md:gap-x-1.5 md:whitespace-nowrap"
            >
              <span className="font-display text-base leading-5 font-bold text-primary md:text-xl md:leading-normal">
                {formatKrw(activity.price, locale)}
              </span>
              {hasReferencePrice ? (
                <span
                  className="text-xs leading-4 font-medium text-muted"
                  title={activity.referencePriceEstimated ? estimatedPriceTitle : undefined}
                >
                  (≈{" "}
                  {formatDisplayCurrency(
                    activity.referencePrice!,
                    activity.referenceCurrency!,
                    locale,
                  )}
                  )
                </span>
              ) : null}
              <span className="sr-only text-xs text-muted md:not-sr-only md:basis-full md:text-right">
                {tExplore("perPersonLabel")}
              </span>
            </div>
          </div>
        )}
        {preview || !bookingPath ? (
          <button
            type="button"
            aria-label={bookingLabel}
            disabled
            className={`${bookNowClassName} cursor-not-allowed opacity-60`}
          >
            {bookingButtonContent}
          </button>
        ) : loginRequired ? (
          <button
            type="button"
            aria-label={bookingLabel}
            aria-haspopup="dialog"
            onClick={() => {
              onBookingClick?.();
              setLoginPromptOpen(true);
            }}
            className={bookNowClassName}
          >
            {bookingButtonContent}
          </button>
        ) : (
          <Link
            href={bookingPath}
            aria-label={bookingLabel}
            onClick={onBookingClick}
            className={bookNowClassName}
          >
            {bookingButtonContent}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <PageContainer className="pt-2 pb-6 md:py-10">
        <main data-testid="activity-detail-layout" className="mx-auto w-full max-w-[840px]">
          <article className="min-w-0">
            <div className="relative grid h-[260px] grid-cols-1 gap-2 overflow-hidden rounded-3xl md:h-[420px] md:grid-cols-[1.4fr_0.6fr]">
              <button
                type="button"
                aria-label={t("viewPhoto", { number: 1 })}
                onClick={() => setGalleryIndex(0)}
                className="relative min-h-0 cursor-zoom-in md:row-span-2"
              >
                <Image
                  src={activity.heroImageUrl}
                  alt={activity.title}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(max-width: 767px) 100vw, 560px"
                  unoptimized={unoptimizedImages}
                  className="object-cover"
                />
                {galleryImages.length > 1 ? (
                  // 모바일에서는 2·3번 사진이 숨겨지므로 나머지 장수를 대표 사진 위에 알린다
                  <span
                    data-testid="mobile-photo-count"
                    className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-ink/70 px-3 py-1.5 font-display text-xs font-bold text-white backdrop-blur-[2px] md:hidden"
                  >
                    {t("morePhotos", { count: galleryImages.length - 1 })}
                  </span>
                ) : null}
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

            <div className="flex min-w-0 flex-col gap-10 py-8 [overflow-wrap:anywhere] md:py-10">
              <section className="flex flex-col gap-3">
                {activity.isTranslated === true && (
                  <p className="mb-1 flex items-center gap-1.5 text-xs leading-5 text-muted">
                    <TranslationIcon className="size-4 shrink-0" />
                    {t("autoTranslated")}
                  </p>
                )}
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
                <p className="max-w-2xl leading-7 whitespace-pre-line text-muted">
                  {activity.description}
                </p>
              </section>

              <section
                className={`grid gap-4 border-t border-line-soft pt-6 max-md:gap-2 max-md:pt-4 md:grid-cols-2 ${activity.availableLanguages?.some(isActivityLanguage) ? "xl:grid-cols-2" : "xl:grid-cols-3"}`}
              >
                <button
                  type="button"
                  onClick={() => scrollToSection(SECTION_IDS.aboutHost)}
                  className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary max-md:min-h-11 max-md:gap-3 max-md:rounded-none max-md:border-0 max-md:px-0 max-md:py-1.5"
                >
                  <Avatar
                    name={activity.host.name}
                    src={activity.host.avatarUrl}
                    size={48}
                    className="max-md:size-8! max-md:text-xs!"
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-ink max-md:text-[13px]">
                      {activity.host.name}
                    </h3>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(SECTION_IDS.meetingPoint)}
                  className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary max-md:min-h-11 max-md:gap-3 max-md:rounded-none max-md:border-0 max-md:px-0 max-md:py-1.5"
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-canvas-soft max-md:size-8 max-md:rounded-none max-md:border-0">
                    <MapPinIcon className="size-5 text-primary max-md:size-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-ink max-md:text-[13px]">
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
                    className="flex items-center gap-4 rounded-2xl border border-line-soft bg-canvas-soft p-5 text-left transition-colors hover:border-primary max-md:min-h-11 max-md:gap-3 max-md:rounded-none max-md:border-0 max-md:px-0 max-md:py-1.5"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-canvas-soft max-md:size-8 max-md:rounded-none max-md:border-0">
                      <ClockIcon className="size-5 text-primary max-md:size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-ink max-md:text-[13px]">
                        {t("duration")}
                      </h3>
                      <p className="text-xs text-muted">{totalDurationLabel}</p>
                    </div>
                  </button>
                ) : null}
                <ActivityLanguages languages={activity.availableLanguages} summary />
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
                            {activity.activityType !== "REFERRAL" && (
                              <>{t("itineraryStep", { number: index + 1 })} · </>
                            )}
                            {t("itineraryMinutes", { minutes: item.durationMinutes })}
                          </p>
                          <h3 className="font-display text-base font-bold text-ink md:text-lg">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-6 whitespace-pre-line text-muted">
                            {item.description}
                          </p>
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
                <div className="flex items-start gap-3 rounded-2xl border border-line-soft bg-canvas-soft p-4">
                  <button
                    type="button"
                    aria-label={t("viewHostProfile", { name: activity.host.name })}
                    onClick={() => setHostProfileOpen(true)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-80"
                  >
                    <Avatar name={activity.host.name} src={activity.host.avatarUrl} size={40} />
                  </button>
                  <div className="min-w-0">
                    <h3>
                      <button
                        type="button"
                        onClick={() => setHostProfileOpen(true)}
                        className="min-h-11 font-display text-sm font-bold text-primary transition-colors hover:text-primary-hover"
                      >
                        {activity.host.name}
                      </button>
                    </h3>
                    {activity.hostIntroduction ? (
                      <p className="text-[13px] leading-6 whitespace-pre-line text-ink md:text-sm">
                        {activity.hostIntroduction}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              {showReviews ? (
                <ActivityReviewsSection
                  activityId={activity.id}
                  id={SECTION_IDS.reviews}
                  initialReviews={initialReviews}
                />
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

              {activity.activityType !== "REFERRAL" && (
                <ActivityPriceTiers
                  tiers={activity.priceTiers ?? []}
                  basePrice={activity.originalPrice ?? activity.price}
                  discountPercent={hasDiscount ? activity.discountPercent : undefined}
                />
              )}

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

          {showBookingBar && bottomBar === "inline" ? (
            <div
              data-testid="booking-bottom-bar"
              className="rounded-2xl border border-line-soft bg-canvas-soft p-4"
            >
              {bottomBarContent}
            </div>
          ) : null}
        </main>
      </PageContainer>

      {showBookingBar && bottomBar === "fixed" ? (
        <div
          ref={fixedBarRef}
          data-testid="booking-bottom-bar"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line-soft bg-canvas-soft/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(61,45,43,0.08)] backdrop-blur md:pt-2.5 md:pb-[max(0.875rem,env(safe-area-inset-bottom))]"
        >
          {bottomBarContent}
        </div>
      ) : null}

      {showBookingBar && calendarOpen ? (
        <AvailabilityCalendarDialog
          sessions={bookableSessions}
          preferredDate={preferredDate}
          selectedSessionId={selectedSessionId}
          durationMinutes={activity.durationMinutes}
          onSelectSession={handleCalendarSelect}
          onClose={() => setCalendarOpen(false)}
        />
      ) : null}

      {loginPromptOpen && bookingPath ? (
        <LoginPromptDialog
          returnTo={bookingPath}
          emailLoginEnabled={emailLoginEnabled}
          onClose={() => setLoginPromptOpen(false)}
        />
      ) : null}

      {hostProfileOpen ? (
        <HostProfileDialog
          host={activity.host}
          hostIntroduction={activity.hostIntroduction}
          currentActivityId={activity.id}
          showHostedActivities
          canContact={!preview}
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
