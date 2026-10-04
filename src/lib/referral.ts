import type { ReferralActivityRequest, ReferralInvitation } from "@/types/referral";

const ACTIVITY_FIELDS = [
  "sourceLanguage",
  "title",
  "description",
  "hostIntroduction",
  "imageKeys",
  "includedItems",
  "restrictionNotes",
  "maxCapacity",
  "price",
  "meetingPointName",
  "meetingPlaceId",
  "meetingLatitude",
  "meetingLongitude",
  "status",
  "schedules",
  "itineraries",
] as const;

export const REFERRAL_MAX_PRICE = 9_999_999_999;

/** This is a service starting price, never a platform payment amount. */
export function isReferralPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= REFERRAL_MAX_PRICE
  );
}

/** Whitelist, including at the BFF: never forward currency, discounts or ownership. */
export function referralActivityPayload(input: object): ReferralActivityRequest {
  if (!("price" in input) || !isReferralPrice(input.price))
    throw new Error("Invalid referral price");
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => (ACTIVITY_FIELDS as readonly string[]).includes(key)),
  ) as unknown as ReferralActivityRequest;
}
export function positiveReferralId(value: string) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))
    throw new Error("Invalid ID");
  return value;
}
export function referralQuery(input: URLSearchParams, admin: boolean, applicants = true) {
  const output = new URLSearchParams();
  for (const key of applicants ? ["activityId", ...(admin ? ["buddyId"] : []), "scheduleId"] : []) {
    const value = input.get(key);
    if (value) output.set(key, positiveReferralId(value));
  }
  if (applicants) {
    const status = input.get("status");
    if (status) {
      if (!["CONFIRMED", "CANCELLED", "COMPLETED"].includes(status))
        throw new Error("Invalid status");
      output.set("status", status);
    }
    for (const key of ["from", "until"]) {
      const value = input.get(key);
      if (value) {
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value
        )
          throw new Error("Invalid date");
        output.set(key, value);
      }
    }
    if (output.has("from") && output.has("until") && output.get("from")! > output.get("until")!)
      throw new Error("Invalid date range");
  }
  for (const key of ["page", "size"]) {
    const value = input.get(key);
    if (value) {
      const n = Number(value);
      if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(n) ||
        n < (key === "size" ? 1 : 0) ||
        (key === "size" && n > 100)
      )
        throw new Error("Invalid pagination");
      output.set(key, String(n));
    }
  }
  return output.toString();
}
export function invitationState(
  invitation: Pick<ReferralInvitation, "usedAt" | "revokedAt" | "expiresAt">,
  now = Date.now(),
) {
  if (invitation.usedAt) return "used";
  if (invitation.revokedAt) return "revoked";
  return Date.parse(invitation.expiresAt) <= now ? "expired" : "available";
}
const CODE_STORAGE = "hanbuddy.referral.invitation";
export function clearReferralCode() {
  try {
    sessionStorage.removeItem(CODE_STORAGE);
  } catch {
    /* Browser storage may be disabled. */
  }
}
export function consumeReferralCode(): string | null {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const hasCode = fragment.has("code");
  const incoming = fragment.get("code");
  if (window.location.hash)
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + window.location.search,
    );
  try {
    if (hasCode) {
      clearReferralCode();
      if (incoming && /^[A-Za-z0-9_-]{43}$/.test(incoming)) {
        sessionStorage.setItem(CODE_STORAGE, incoming);
        return incoming;
      }
      return null;
    }
    const saved = sessionStorage.getItem(CODE_STORAGE);
    return saved && /^[A-Za-z0-9_-]{43}$/.test(saved) ? saved : null;
  } catch {
    return incoming && /^[A-Za-z0-9_-]{43}$/.test(incoming) ? incoming : null;
  }
}
