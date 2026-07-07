import type {
  Activity,
  IncludedItem,
  Session,
  TouristActivityDetail,
  TouristActivitySummary,
} from "@/types/activity";

const DEFAULT_ACTIVITY_RATING = 5;
const DEFAULT_ACTIVITY_REVIEW_COUNT = 0;
const DEFAULT_MAP_IMAGE_URL = "/images/map-bukchon.jpg";

export function mapTouristActivitySummaryToActivity(summary: TouristActivitySummary): Activity {
  return {
    id: String(summary.activityId),
    title: summary.title,
    description: summary.description,
    location: summary.meetingPointName,
    district: summary.meetingPointName,
    categoryLabel: "HanBuddy activity",
    imageUrl: summary.thumbnailImageUrl,
    heroImageUrl: summary.thumbnailImageUrl,
    rating: DEFAULT_ACTIVITY_RATING,
    reviewCount: DEFAULT_ACTIVITY_REVIEW_COUNT,
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
      mapImageUrl: DEFAULT_MAP_IMAGE_URL,
    },
  };
}

export function mapTouristActivityDetailToActivity(detail: TouristActivityDetail): Activity {
  const images = [...detail.images].sort((left, right) => left.imageOrder - right.imageOrder);
  const heroImageUrl = images[0]?.imageUrl ?? detail.thumbnailImageUrl;

  return {
    ...mapTouristActivitySummaryToActivity(detail),
    imageUrl: detail.thumbnailImageUrl || heroImageUrl,
    heroImageUrl,
    included: detail.includedItems.map(toIncludedItem),
    restrictions: detail.restrictionNotes,
    sessions: detail.schedules.map<Session>((schedule) => ({
      id: String(schedule.activityScheduleId),
      dateLabel: schedule.activityDate,
      timeLabel: schedule.startTime,
      spotsLeft: schedule.remainingCapacity,
    })),
    meetingPoint: {
      name: detail.meetingPointName,
      area: detail.meetingPointAddress,
      mapImageUrl: DEFAULT_MAP_IMAGE_URL,
    },
  };
}

function toIncludedItem(label: string): IncludedItem {
  return { label, provided: true };
}
