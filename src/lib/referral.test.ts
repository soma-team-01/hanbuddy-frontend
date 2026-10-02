import { describe, expect, it } from "vitest";
import {
  invitationState,
  referralActivityPayload,
  referralQuery,
  consumeReferralCode,
} from "./referral";

describe("referral contracts", () => {
  it("never includes price, discounts, owner or type in the referral payload", () => {
    const input = {
      title: "Seoul visit",
      price: 15000,
      currency: "KRW",
      discountPercent: 10,
      activityType: "STANDARD",
      buddyId: 3,
      status: "ACTIVE",
      schedules: [{ startAt: "2027-01-02T14:00:00+09:00", maxCapacity: 4 }],
    };
    expect(referralActivityPayload(input)).toEqual({
      title: "Seoul visit",
      status: "ACTIVE",
      schedules: input.schedules,
    });
  });
  it("keeps applicant filters but never forwards buddyId to partner endpoints", () => {
    expect(
      referralQuery(
        new URLSearchParams("buddyId=4&activityId=3&from=2026-10-01&status=CONFIRMED&code=secret"),
        false,
      ),
    ).toBe("activityId=3&status=CONFIRMED&from=2026-10-01");
  });
  it("rejects invalid dates, page sizes and status filters", () => {
    for (const query of [
      "from=2026-02-30",
      "size=101",
      "status=INVALID",
      "page=-1",
      "from=2026-10-02&until=2026-10-01",
    ]) {
      expect(() => referralQuery(new URLSearchParams(query), true)).toThrow();
    }
  });
  it("prioritizes used/revoked state and recognizes expiration", () => {
    const invitation = { usedAt: null, revokedAt: null, expiresAt: "2026-10-02T00:00:00Z" };
    expect(invitationState(invitation, Date.parse(invitation.expiresAt))).toBe("expired");
    expect(invitationState({ ...invitation, usedAt: "2026-10-01" }, 0)).toBe("used");
    expect(invitationState({ ...invitation, revokedAt: "2026-10-01" }, 0)).toBe("revoked");
    expect(invitationState(invitation, 0)).toBe("available");
  });
  it("removes the fragment immediately and persists only a valid code for login return", () => {
    const code = "a".repeat(43);
    window.history.replaceState(null, "", `/ko/referral/create#code=${code}`);
    expect(consumeReferralCode()).toBe(code);
    expect(window.location.hash).toBe("");
    expect(consumeReferralCode()).toBe(code);
    window.history.replaceState(null, "", "/ko/referral/create#code=invalid");
    expect(consumeReferralCode()).toBeNull();
    expect(consumeReferralCode()).toBeNull();
  });
});
