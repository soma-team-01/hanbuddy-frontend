export interface Host {
  name: string;
  bio: string;
  avatarUrl: string | null;
}

export interface IncludedItem {
  label: string;
  provided: boolean;
}

export interface Session {
  id: string;
  dateLabel: string;
  timeLabel: string;
  spotsLeft: number;
}

export interface MeetingPoint {
  name: string;
  area: string;
  placeId?: string;
  mapImageUrl?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  district: string;
  categoryLabel?: string;
  imageUrl: string;
  heroImageUrl: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  /** 원화(₩) 기준 1인당 가격 */
  price: number;
  /** 할인 전 가격 (있을 때만 취소선으로 노출) */
  originalPrice?: number;
  host: Host;
  included: IncludedItem[];
  restrictions: string[];
  sessions: Session[];
  meetingPoint: MeetingPoint;
}

export interface ActivityImageResponse {
  imageUrl: string;
  imageOrder: number;
}

export type TouristActivityScheduleStatus = "OPEN" | "CLOSED";

export interface TouristActivitySchedule {
  activityScheduleId: number;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  startAt: string;
  remainingCapacity: number;
  status: TouristActivityScheduleStatus;
}

export interface TouristActivitySummary {
  activityId: number;
  title: string;
  description: string;
  thumbnailImageUrl: string;
  buddyName: string;
  buddyProfileImageUrl: string | null;
  meetingPointName: string;
  meetingPlaceId: string;
  price: number;
  currency: string;
}

export interface TouristActivityDetail extends TouristActivitySummary {
  buddyId: number;
  includedItems: string[];
  restrictionNotes: string[];
  images: ActivityImageResponse[];
  schedules: TouristActivitySchedule[];
}
