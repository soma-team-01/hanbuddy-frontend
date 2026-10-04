import { beforeEach, expect, it, vi } from "vitest";
import { getReferralInvitations } from "./referral";
import { getBuddyInvitationHistory } from "./referral-invitation-history";
import type { ReferralInvitation } from "@/types/referral";

vi.mock("./referral", () => ({ getReferralInvitations: vi.fn() }));
beforeEach(() => {
  vi.mocked(getReferralInvitations).mockReset();
});
const invitation = (invitationId: number, buddyId: number) =>
  ({ invitationId, buddyId, code: null }) as ReferralInvitation;

it("reads every page and returns only the selected buddy, deduplicating page overlap", async () => {
  vi.mocked(getReferralInvitations).mockImplementation(async (page = 0) => ({
    status: "success",
    data: {
      content: page === 0 ? [invitation(1, 8)] : [invitation(2, 7), invitation(2, 7)],
      page,
      size: 20,
      totalElements: 21,
      totalPages: 2,
      hasNext: page === 0,
    },
  }));
  expect(await getBuddyInvitationHistory(7)).toEqual([invitation(2, 7)]);
  expect(getReferralInvitations).toHaveBeenNthCalledWith(1, 0);
  expect(getReferralInvitations).toHaveBeenNthCalledWith(2, 1);
});

it("rejects a later page failure instead of showing an incomplete history", async () => {
  vi.mocked(getReferralInvitations)
    .mockResolvedValueOnce({
      status: "success",
      data: {
        content: [invitation(1, 7)],
        page: 0,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        hasNext: true,
      },
    })
    .mockResolvedValueOnce({ status: "unauthenticated" });
  await expect(getBuddyInvitationHistory(7)).rejects.toThrow();
});

it("stops scanning after the selected account changes", async () => {
  const controller = new AbortController();
  vi.mocked(getReferralInvitations).mockImplementation(async () => {
    controller.abort();
    return {
      status: "success",
      data: {
        content: [invitation(1, 7)],
        page: 0,
        size: 20,
        totalElements: 21,
        totalPages: 2,
        hasNext: true,
      },
    };
  });
  await expect(getBuddyInvitationHistory(7, controller.signal)).rejects.toThrow();
  expect(getReferralInvitations).toHaveBeenCalledTimes(1);
});
