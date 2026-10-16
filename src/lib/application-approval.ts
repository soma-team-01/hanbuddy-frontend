import type { BackendApplicationStatus, BuddyRejectionReason } from "@/types/application";
export const BUDDY_REJECTION_REASONS: BuddyRejectionReason[] = [
  "BOOKING_UNAVAILABLE",
  "INSUFFICIENT_PARTICIPANTS",
  "RESOURCE_UNAVAILABLE",
  "EXTERNAL_CIRCUMSTANCES",
  "BUDDY_OTHER",
];
export function isBuddyRejection(reason: string): reason is BuddyRejectionReason {
  return BUDDY_REJECTION_REASONS.some((value) => value === reason);
}
/** Submitted booking states; PENDING_APPROVAL does not prove payment capture. */
export function isSubmittedApplicationStatus(status: BackendApplicationStatus) {
  return status === "PENDING_APPROVAL" || status === "CONFIRMED" || status === "COMPLETED";
}

/** Display both outcomes as Declined, while preserving their distinct server states. */
export function isDeclinedApplicationStatus(status: string) {
  return ["REJECTED", "EXPIRED", "rejected", "expired"].includes(status);
}

export function isClosedApplicationStatus(status: string) {
  return status === "CANCELLED" || status === "cancelled" || isDeclinedApplicationStatus(status);
}
