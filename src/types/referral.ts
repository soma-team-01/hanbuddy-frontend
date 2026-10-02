import type { ActivityUpsertRequest, MyActivitySummaryResponse } from "./buddy";
import type { ContactMethod } from "@/lib/auth/types";

export type ActivityType = "STANDARD" | "REFERRAL";
export type ReferralActivityRequest = Omit<
  ActivityUpsertRequest,
  "currency" | "discountPercent" | "discountEndDate"
>;
export interface ReferralInvitation {
  invitationId: number;
  buddyId: number;
  issuedBy: number;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  activityId: number | null;
  code: string | null;
}
export interface ReferralNotice {
  activityId: number;
  partnerUserId: number;
  partnerName: string;
  serviceNotice: string;
  consentVersion: string;
  sharedFields: string[];
  purpose: string;
}
export interface ReferralApplicationRequest {
  activityScheduleId: number;
  guestCount: number;
  partnerSharingAgreed: boolean;
  consentVersion: string;
  specialRequest?: string | null;
  /** Explicit reapplication only: latest cancelled application for this activity/session. */
  reapplyFromApplicationId?: number;
}
export interface ReferralApplicant {
  applicationId: number;
  activityId: number;
  activityTitle: string;
  partnerUserId: number;
  applicantUserId: number;
  applicantName: string;
  contactMethod: ContactMethod;
  contactCountryCode: string | null;
  contactIdentifier: string;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  createdAt: string;
  consentVersion: string;
  consentedAt: string;
  scheduleId: number | null;
  startAt: string | null;
  guestCount: number;
  specialRequest?: string | null;
}
export interface ReferralActivitySummary {
  partnerUserId: number;
  partnerName: string;
  activity: MyActivitySummaryResponse;
}
