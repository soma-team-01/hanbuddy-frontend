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

export interface ActivityItineraryResponse {
  itineraryId: number;
  title: string;
  description: string;
  durationMinutes: number;
  imageUrl: string;
  itemOrder: number;
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
  /** 진행 중인 할인율(%). 백엔드는 항상 내려주며 할인이 없으면 null (UI 반영은 후속 작업) */
  discountPercent?: number | null;
  /** Asia/Seoul 기준 할인 종료일 (YYYY-MM-DD). 할인이 없으면 null */
  discountEndDate?: string | null;
  /** 할인 적용가 (KRW 정수 반올림). 진행 중인 할인이 없으면 null */
  discountedPrice?: number | null;
  /** 모든 일정이 예약 마감이면 true */
  isSoldOut?: boolean;
}

export interface TouristActivityDetail extends TouristActivitySummary {
  buddyId: number;
  /** 버디 본인 소개 (활동별 저장) */
  hostIntroduction?: string;
  includedItems: string[];
  restrictionNotes: string[];
  images: ActivityImageResponse[];
  schedules: TouristActivitySchedule[];
  /** 활동 일정표 목록 (UI 반영은 후속 작업) */
  itineraries?: ActivityItineraryResponse[];
}
