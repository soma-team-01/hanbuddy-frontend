import type { Locale } from "@/i18n/routing";
import { formatSeoulDate, formatSeoulTime, getSeoulDateTimeParts } from "@/lib/datetime";
import type {
  Activity,
  ActivityItineraryItem,
  IncludedItem,
  Session,
  TouristActivityDetail,
  TouristActivitySummary,
} from "@/types/activity";

export function mapTouristActivitySummaryToActivity(summary: TouristActivitySummary): Activity {
  // 프론트·백엔드의 순차 배포 중에도 기존 응답은 원화 가격으로 안전하게 표시한다.
  const displayPrice = summary.displayPrice ?? {
    price: summary.price,
    discountedPrice: summary.discountedPrice ?? null,
    currency: "KRW" as const,
    exchangeRateDate: null,
    estimated: false,
  };
  const hasActiveDiscount =
    summary.discountedPrice !== null && summary.discountedPrice !== undefined;
  const hasReferencePrice = displayPrice.currency !== "KRW";

  return {
    id: String(summary.activityId),
    title: summary.title,
    description: summary.description,
    location: summary.meetingPointName,
    district: summary.meetingPointName,
    imageUrl: summary.thumbnailImageUrl,
    heroImageUrl: summary.thumbnailImageUrl,
    images: summary.thumbnailImageUrl ? [summary.thumbnailImageUrl] : [],
    price: summary.discountedPrice ?? summary.price,
    originalPrice: hasActiveDiscount ? summary.price : undefined,
    referencePrice: hasReferencePrice
      ? (displayPrice.discountedPrice ?? displayPrice.price)
      : undefined,
    referenceOriginalPrice: hasReferencePrice && hasActiveDiscount ? displayPrice.price : undefined,
    referenceCurrency: hasReferencePrice ? displayPrice.currency : undefined,
    referencePriceEstimated: hasReferencePrice ? displayPrice.estimated : undefined,
    referencePriceExchangeRateDate: hasReferencePrice ? displayPrice.exchangeRateDate : undefined,
    discountPercent: summary.discountPercent ?? undefined,
    durationMinutes:
      summary.totalDurationHours != null && summary.totalDurationHours > 0
        ? Math.round(summary.totalDurationHours * 60)
        : undefined,
    isSoldOut: summary.isSoldOut,
    rating: summary.averageRating ?? undefined,
    reviewCount: summary.reviewCount ?? undefined,
    host: {
      id: summary.buddyId,
      name: summary.buddyName,
      bio: "Local HanBuddy host",
      avatarUrl: summary.buddyProfileImageUrl,
    },
    included: [],
    restrictions: [],
    sessions: [],
    meetingPoint: {
      name: summary.meetingPointName,
      area: summary.meetingPointName,
      placeId: summary.meetingPlaceId,
    },
  };
}

export function mapTouristActivityDetailToActivity(
  detail: TouristActivityDetail,
  dateTimeUnavailable: string,
  locale: Locale = "en",
  hostBio = "Local HanBuddy host",
): Activity {
  const images = [...detail.images].sort((left, right) => left.imageOrder - right.imageOrder);
  const heroImageUrl = images[0]?.imageUrl ?? detail.thumbnailImageUrl;

  return {
    ...mapTouristActivitySummaryToActivity(detail),
    imageUrl: detail.thumbnailImageUrl || heroImageUrl,
    heroImageUrl,
    images: images.map(({ imageUrl }) => imageUrl),
    host: {
      id: detail.buddyId,
      name: detail.buddyName,
      bio: hostBio,
      avatarUrl: detail.buddyProfileImageUrl,
    },
    hostIntroduction: detail.hostIntroduction?.trim() ? detail.hostIntroduction : undefined,
    included: detail.includedItems.map(toIncludedItem),
    restrictions: detail.restrictionNotes,
    sessions: detail.schedules.map<Session>((schedule) => {
      return {
        id: String(schedule.activityScheduleId),
        startAt: schedule.startAt,
        dateKey: getSeoulDateTimeParts(schedule.startAt)?.date,
        dateLabel: formatSeoulDate(schedule.startAt, locale) ?? dateTimeUnavailable,
        timeLabel: formatSeoulTime(schedule.startAt, locale) ?? "",
        spotsLeft: schedule.remainingCapacity,
      };
    }),
    itinerary: [...(detail.itineraries ?? [])]
      .sort((left, right) => left.itemOrder - right.itemOrder)
      .map<ActivityItineraryItem>((item) => ({
        id: String(item.itineraryId),
        title: item.title,
        description: item.description,
        durationMinutes: item.durationMinutes,
        imageUrl: item.imageUrl,
      })),
    meetingPoint: {
      name: detail.meetingPointName,
      area: detail.meetingPointName,
      placeId: detail.meetingPlaceId,
    },
  };
}

function toIncludedItem(label: string): IncludedItem {
  return { label, provided: true };
}
