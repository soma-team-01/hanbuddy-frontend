import type { Locale } from "@/i18n/routing";
import { formatSeoulDate, formatSeoulTime } from "@/lib/datetime";
import type {
  Activity,
  IncludedItem,
  Session,
  TouristActivityDetail,
  TouristActivitySummary,
} from "@/types/activity";

export function mapTouristActivitySummaryToActivity(summary: TouristActivitySummary): Activity {
  const hasActiveDiscount =
    summary.discountedPrice !== undefined && summary.discountedPrice !== null;

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
    discountPercent: summary.discountPercent ?? undefined,
    isSoldOut: summary.isSoldOut,
    host: {
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
      name: detail.buddyName,
      bio: hostBio,
      avatarUrl: detail.buddyProfileImageUrl,
    },
    included: detail.includedItems.map(toIncludedItem),
    restrictions: detail.restrictionNotes,
    sessions: detail.schedules.map<Session>((schedule) => {
      return {
        id: String(schedule.activityScheduleId),
        dateLabel: formatSeoulDate(schedule.startAt, locale) ?? dateTimeUnavailable,
        timeLabel: formatSeoulTime(schedule.startAt, locale) ?? "",
        spotsLeft: schedule.remainingCapacity,
      };
    }),
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
