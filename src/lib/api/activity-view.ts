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
    },
  };
}

function toIncludedItem(label: string): IncludedItem {
  return { label, provided: true };
}
