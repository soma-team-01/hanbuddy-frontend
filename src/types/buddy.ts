export type MyActivityStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type ActivityScheduleStatus = "OPEN" | "CLOSED";

export interface ActivityScheduleRequest {
  /** Asia/Seoul 오프셋을 포함한 date-time (예: 2026-07-19T13:00:00+09:00) */
  startAt: string;
}

export interface ActivityUpsertRequest {
  title: string;
  description: string;
  imageKeys: string[];
  includedItems: string[];
  restrictionNotes: string[];
  maxCapacity: number;
  price: number;
  currency: string;
  meetingPointName: string;
  meetingPlaceId: string;
  status: MyActivityStatus;
  schedules: ActivityScheduleRequest[];
}

export interface ActivityImageResponse {
  imageUrl: string;
  imageOrder: number;
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
  includedItems: string[];
  restrictionNotes: string[];
  maxCapacity: number;
  price: number;
  currency: string;
  meetingPointName: string;
  meetingPlaceId: string;
  images: ActivityImageResponse[];
  schedules: ActivityScheduleResponse[];
}

export interface BuddyScheduleDateResponse {
  date: string;
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
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  specialRequest: string | null;
  appliedAt: string;
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
