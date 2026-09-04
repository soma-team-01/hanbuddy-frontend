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

export type AdminAccountStatus = BuddyApplicationStatus;
export type AdminCommissionPolicy = "EARLY_10" | "STANDARD_20";
export type AdminActivityStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DELETED";
export type AdminApplicationStatus =
  "PENDING_PAYMENT" | "SUPERSEDED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type AdminPaymentStatus =
  "CREATED" | "CONFIRMED" | "REVIEW_REQUIRED" | "FAILED" | "CANCELLED" | "EXPIRED";

export interface AdminPageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  hasNext: boolean;
}

export interface AdminUserFilters {
  userId?: number;
  email?: string;
  name?: string;
  displayName?: string;
  userType?: "TOURIST" | "BUDDY" | "ADMIN";
  accountStatus?: AdminAccountStatus;
  nationalityCode?: string;
  joinedFrom?: string;
  joinedTo?: string;
  page?: number;
  size?: number;
}

export interface AdminBuddyFilters extends Omit<AdminUserFilters, "userId" | "userType"> {
  buddyId?: number;
}

export interface AdminUserSummary {
  userId: number;
  email: string;
  name: string;
  displayName: string;
  userType: "TOURIST" | "BUDDY" | "ADMIN";
  accountStatus: AdminAccountStatus;
  nationalityCode: string;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  birthDate: string | null;
  contactMethod: ContactMethod;
  contactCountryCode: string | null;
  contactIdentifier: string | null;
  reviewedAt: string | null;
  reviewedBy: number | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  suspendedAt: string | null;
  suspendedBy: number | null;
  activityCount: number;
  applicationCount: number;
  paymentCount: number;
  reviewCount: number;
  agreementCount: number;
  updatedAt: string;
}

export interface AdminUserActivity {
  activityId: number;
  title: string;
  status: AdminActivityStatus;
  price: number;
  currency: string;
  createdAt: string;
}

export interface AdminUserApplication {
  applicationId: number;
  activityId: number;
  activityTitle: string;
  scheduleId: number;
  scheduleStartAt: string;
  guestCount: number;
  status: AdminApplicationStatus;
  cancellationReason: string | null;
  cancellationDetail: string | null;
  createdAt: string;
}

export interface AdminUserPayment {
  paymentId: number;
  applicationId: number;
  activityId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  commissionRate: number;
  guidePayoutAmountKrw: number;
  status: AdminPaymentStatus;
  approvedAt: string | null;
  createdAt: string;
}

export interface AdminUserReview {
  reviewId: number;
  activityId: number;
  activityTitle: string;
  rating: number;
  content: string;
  sourceLanguage: string;
  createdAt: string;
}

export interface AdminUserAgreement {
  userAgreementId: number;
  type: string;
  version: string;
  required: boolean;
  agreed: boolean;
  decidedAt: string;
  withdrawnAt: string | null;
}

export type AdminUserHistory =
  | AdminUserActivity
  | AdminUserApplication
  | AdminUserPayment
  | AdminUserReview
  | AdminUserAgreement;

export type AdminUserHistoryType =
  "activities" | "applications" | "payments" | "reviews" | "agreements";

export interface AdminReasonRequest {
  reason: string;
}

export interface AdminBuddySummary {
  buddyId: number;
  email: string;
  name: string;
  displayName: string;
  accountStatus: AdminAccountStatus;
  nationalityCode: string;
  commissionPolicy: AdminCommissionPolicy | null;
  createdAt: string;
}

export interface AdminBuddyDetail {
  user: AdminUserDetail;
  commissionPolicy: AdminCommissionPolicy | null;
  commissionRate: number | null;
  averageRating: number | null;
  reviewCount: number;
}

export interface AdminBuddyPerformance {
  buddyId: number;
  totalActivityCount: number;
  activeActivityCount: number;
  applicationCounts: Record<AdminApplicationStatus, number>;
  confirmedPaymentCount: number;
  confirmedPaymentAmountKrw: number;
  guidePayoutAmountKrw: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface AdminCommissionUpdateRequest extends AdminReasonRequest {
  commissionPolicy: AdminCommissionPolicy;
}

export type AdminUserAuditAction =
  "USER_SUSPENDED" | "USER_REACTIVATED" | "BUDDY_COMMISSION_CHANGED";

export interface AdminAuditLog {
  auditLogId: number;
  adminId: number;
  adminName: string | null;
  adminEmail: string | null;
  action: AdminUserAuditAction | string;
  targetType: string;
  targetId: number;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

export type AdminAuditLogSummary = Omit<AdminAuditLog, "beforeState" | "afterState">;

export interface AdminAuditLogPageResponse {
  logs: AdminAuditLogSummary[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  hasNext: boolean;
}
