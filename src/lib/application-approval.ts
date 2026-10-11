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
export function isPaidApplicationStatus(status: BackendApplicationStatus) {
  return status === "PENDING_APPROVAL" || status === "CONFIRMED" || status === "COMPLETED";
}
