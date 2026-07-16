import { getSeoulDateTimeParts } from "@/lib/datetime";
import type {
  Activity,
  IncludedItem,
  Session,
  TouristActivityDetail,
  TouristActivitySummary,
} from "@/types/activity";

export function mapTouristActivitySummaryToActivity(summary: TouristActivitySummary): Activity {
  return {
    id: String(summary.activityId),
    title: summary.title,
    description: summary.description,
    location: summary.meetingPointName,
    district: summary.meetingPointName,
    imageUrl: summary.thumbnailImageUrl,
    heroImageUrl: summary.thumbnailImageUrl,
    price: summary.price,
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
): Activity {
  const images = [...detail.images].sort((left, right) => left.imageOrder - right.imageOrder);
  const heroImageUrl = images[0]?.imageUrl ?? detail.thumbnailImageUrl;

  return {
    ...mapTouristActivitySummaryToActivity(detail),
    imageUrl: detail.thumbnailImageUrl || heroImageUrl,
    heroImageUrl,
    included: detail.includedItems.map(toIncludedItem),
    restrictions: detail.restrictionNotes,
    sessions: detail.schedules.map<Session>((schedule) => {
      const parts = getSeoulDateTimeParts(schedule.startAt);
      return {
        id: String(schedule.activityScheduleId),
        dateLabel: parts?.date ?? dateTimeUnavailable,
        timeLabel: parts?.time ?? "",
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
