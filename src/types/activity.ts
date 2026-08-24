export interface Host {
  /** 백엔드 버디 식별자. 동명이인이 있어도 이 값으로 호스트를 구분한다 */
  id?: number;
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
  /** 오프셋 포함 원본 시작 일시 — 종료 시간 계산용 */
  startAt?: string;
  /** Asia/Seoul 기준 날짜 키 (YYYY-MM-DD) — 캘린더 그룹핑용 */
  dateKey?: string;
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

export interface ActivityItineraryItem {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  imageUrl: string;
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
  /** 원화(₩) 기준 1인당 가격 (진행 중인 할인이 있으면 할인 적용가) */
  price: number;
  /** 할인 전 가격 (있을 때만 취소선으로 노출) */
  originalPrice?: number;
  /** 진행 중인 할인율(%) — 카드 할인 배지에 사용 */
  discountPercent?: number;
  /** 총 소요 시간(분). 백엔드 totalDurationHours(0.5시간 단위)를 분으로 환산한 값 */
  durationMinutes?: number;
  /** 모든 일정이 예약 마감이면 true */
  isSoldOut?: boolean;
  host: Host;
  /** 버디가 활동별로 작성한 자기소개 */
  hostIntroduction?: string;
  included: IncludedItem[];
  restrictions: string[];
  sessions: Session[];
  /** 활동 일정표 (itemOrder 순 정렬) */
  itinerary?: ActivityItineraryItem[];
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
  buddyId: number;
  title: string;
  description: string;
  /** 소수 첫째 자리 반올림 평균 별점. 리뷰가 없으면 null */
  averageRating?: number | null;
  /** 이 활동에 달린 리뷰 수 */
  reviewCount?: number | null;
  /** 총 소요시간(시간 단위). 일정표 소요시간 합을 0.5시간 단위로 올림한 값 */
  totalDurationHours?: number | null;
  thumbnailImageUrl: string;
  buddyName: string;
  buddyProfileImageUrl: string | null;
  meetingPointName: string;
  meetingPlaceId: string;
  meetingLatitude?: number | null;
  meetingLongitude?: number | null;
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
  /** 버디 본인 소개 (활동별 저장) */
  hostIntroduction?: string;
  includedItems: string[];
  restrictionNotes: string[];
  images: ActivityImageResponse[];
  schedules: TouristActivitySchedule[];
  /** 활동 일정표 목록 (UI 반영은 후속 작업) */
  itineraries?: ActivityItineraryResponse[];
}
