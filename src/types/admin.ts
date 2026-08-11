import type { ContactMethod } from "@/lib/auth/types";

export type BuddyApplicationStatus = "PENDING_APPROVAL" | "ACTIVE" | "REJECTED" | "SUSPENDED";

export interface BuddyApplicationSummary {
  userId: number;
  email: string;
  name: string;
  nationalityCode: string;
  accountStatus: BuddyApplicationStatus;
  appliedAt: string;
}

export interface BuddyApplicationDetail extends BuddyApplicationSummary {
  profileImageKey?: string | null;
  profileImageUrl?: string | null;
  birthDate: string;
  contactMethod: ContactMethod;
  contactCountryCode?: string | null;
  contactIdentifier: string;
  reviewedAt?: string | null;
  reviewedByUserId?: number | null;
  reviewedByName?: string | null;
  rejectionReason?: string | null;
}

export interface RejectBuddyApplicationRequest {
  reason: string;
}
