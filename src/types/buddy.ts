export type MyActivityStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type ActivityScheduleStatus = "OPEN" | "CLOSED";

export interface ActivityScheduleRequest {
  activityDate: string;
  startTime: string;
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
  meetingPointAddress: string;
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
  activityDate: string;
  startTime: string;
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
  meetingPointAddress?: string;
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

export interface BuddyDateActivityApplicationsResponse {
  activityId: number;
  activityTitle: string;
  thumbnailImageUrl: string | null;
  applicantCount: number;
  applicants: BuddyApplicationApplicantSummaryResponse[];
}

export interface BuddyApplicationApplicantDetailResponse extends BuddyApplicationApplicantSummaryResponse {
  status: "PENDING_PAYMENT" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  specialRequest: string | null;
  appliedAt: string;
}

export interface BuddyActivityApplicationsResponse {
  activityId: number;
  activityTitle: string;
  activityDate: string;
  applicantCount: number;
  statusCounts: Record<string, number>;
  applicants: BuddyApplicationApplicantDetailResponse[];
}
