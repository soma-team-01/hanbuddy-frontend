import type { ActivityScheduleStatus } from "./buddy";

export type ScheduleCancellationTaskStatus =
  "QUEUED" | "DISPATCHED" | "REVIEW_REQUIRED" | "COMPLETED" | "NO_PAYMENT" | "EXCLUDED";

export interface ScheduleCancellationApplicant {
  applicationId: number;
  refundStatus: ScheduleCancellationTaskStatus;
  /** Internal code. Never display directly. */
  reviewReason: string | null;
  /** Current linked refund only, not the lifetime refund total. */
  additionalRefundAmount: number | null;
  currency: string | null;
}

export interface ScheduleCancellationResponse {
  activityScheduleId: number;
  status: ActivityScheduleStatus;
  cancelledAt: string | null;
  reason: string | null;
  applicants: ScheduleCancellationApplicant[];
}
