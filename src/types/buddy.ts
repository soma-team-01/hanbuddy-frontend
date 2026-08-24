/** DELETED는 soft delete된 활동 — 목록·상세 응답에서 제외되지만 계약상 존재한다 */
export type MyActivityStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DELETED";
export type ActivityScheduleStatus = "OPEN" | "CLOSED";

export interface ActivityScheduleRequest {
  /** Asia/Seoul 오프셋을 포함한 date-time (예: 2026-07-19T13:00:00+09:00) */
  startAt: string;
}

export interface ActivityItineraryRequest {
  /** 1~20자 */
  title: string;
  /** 5~50자 */
  description: string;
  /** 1 이상의 정수 (분) */
  durationMinutes: number;
  /** Presigned URL 발급 API의 ACTIVITY 목적으로 발급받은 S3 key */
  imageKey: string;
}

export interface ActivityPricePreviewRequest {
  price: number;
  currency: string;
}

export interface ActivityPricePreviewResponse {
  unitPriceKrw: number;
  currency: string;
  commissionRate: number;
  platformCommissionAmountKrw: number;
  estimatedGuidePayoutAmountKrw: number;
}

export interface ActivityUpsertRequest {
  /** 1~20자 */
  title: string;
  /** 30~200자 */
  description: string;
  /** 버디 본인 소개. 30~200자, 활동별 저장 */
  hostIntroduction: string;
  /** 최소 3장, 최대 10장. 첫 번째 이미지가 대표 이미지 */
  imageKeys: string[];
  includedItems: string[];
  restrictionNotes: string[];
  /** 1~100 */
  maxCapacity: number;
  price: number;
  currency: string;
  /** 1~100 (%). 할인 미사용 시 discountEndDate와 함께 생략 */
  discountPercent?: number;
  /** Asia/Seoul 기준 할인 종료일 (YYYY-MM-DD). 오늘 또는 이후 날짜 */
  discountEndDate?: string;
  meetingPointName: string;
  meetingPlaceId: string;
  /** Google Place 미팅 장소 좌표. 둘 다 있을 때만 전송 */
  meetingLatitude?: number;
  meetingLongitude?: number;
  status: MyActivityStatus;
  /** 최대 30개 */
  schedules: ActivityScheduleRequest[];
  /** 최소 1개, 최대 20개 */
  itineraries: ActivityItineraryRequest[];
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

export interface ActivityScheduleResponse {
  scheduleId: number;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  startAt: string;
  bookedCount: number;
  status: ActivityScheduleStatus;
}

export interface MyActivitySummaryResponse {
  activityId: number;
  title: string;
  description: string;
  thumbnailImageUrl: string | null;
  status: MyActivityStatus;
}

export interface MyActivityDetailResponse extends MyActivitySummaryResponse {
  hostIntroduction: string;
  includedItems: string[];
  restrictionNotes: string[];
  maxCapacity: number;
  price: number;
  currency: string;
  /** 설정된 할인이 없으면 null. 종료일이 지난 할인도 설정값 그대로 응답 */
  discountPercent: number | null;
  discountEndDate: string | null;
  /** 할인 적용가 (KRW 정수 반올림). 진행 중인 할인이 없으면 null */
  discountedPrice: number | null;
  meetingPointName: string;
  meetingPlaceId: string;
  meetingLatitude?: number | null;
  meetingLongitude?: number | null;
  images: ActivityImageResponse[];
  schedules: ActivityScheduleResponse[];
  itineraries: ActivityItineraryResponse[];
}

export interface BuddyScheduleDateResponse {
  /** Asia/Seoul 오프셋을 포함한 날짜 시작 일시 */
  dateStartAt: string;
  hasActivity: boolean;
}

export interface BuddyApplicationApplicantSummaryResponse {
  applicationId: number;
  applicantUserId: number;
  applicantName: string;
  applicantProfileImageUrl: string | null;
  applicantNationalityCode: string;
  guestCount: number;
  applicantContactMethod: "WHATSAPP" | "LINE" | "WECHAT" | "PHONE";
  applicantContactCountryCode: string | null;
  applicantContactIdentifier: string;
  /** 신청 시 남긴 요청 사항. 없으면 null */
  specialRequest?: string | null;
}

export interface BuddyDateScheduleApplicationsResponse {
  activityScheduleId: number;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  startAt: string;
  applicantCount: number;
  applicants: BuddyApplicationApplicantSummaryResponse[];
}

export interface BuddyDateActivityApplicationsResponse {
  activityId: number;
  activityTitle: string;
  thumbnailImageUrl: string | null;
  totalApplicantCount: number;
  schedules: BuddyDateScheduleApplicationsResponse[];
}

export interface BuddyApplicationApplicantDetailResponse extends BuddyApplicationApplicantSummaryResponse {
  status: "PENDING_PAYMENT" | "SUPERSEDED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  specialRequest: string | null;
  appliedAt: string;
  /** 취소된 신청의 사유. 취소가 아니면 null */
  cancellationReason?: "SCHEDULE_CONFLICT" | "ILLNESS" | "FOUND_OTHER" | "OTHER" | null;
  /** OTHER일 때 남긴 상세 사유 */
  cancellationDetail?: string | null;
}

export interface BuddyActivityApplicationsResponse {
  activityId: number;
  activityScheduleId: number;
  activityTitle: string;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  startAt: string;
  applicantCount: number;
  statusCounts: Record<string, number>;
  applicants: BuddyApplicationApplicantDetailResponse[];
}
