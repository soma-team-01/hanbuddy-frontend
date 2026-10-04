import { describe, expect, it, vi, beforeEach } from "vitest";
import { getAdminBuddies } from "./admin";
import { searchReferralBuddies, initialBuddySearchCursor } from "./referral-admin-search";
import type { AdminBuddySummary } from "@/types/admin";
vi.mock("./admin", () => ({ getAdminBuddies: vi.fn() }));
const buddy = (buddyId: number) =>
  ({ buddyId, displayName: `업체 ${buddyId}` }) as AdminBuddySummary;
beforeEach(() => {
  vi.mocked(getAdminBuddies).mockReset();
});
describe("referral combined buddy search", () => {
  it("searches three fields separately and deduplicates by buddy ID", async () => {
    vi.mocked(getAdminBuddies).mockImplementation(async (filters) => ({
      status: "success",
      buddies: {
        content: filters.email ? [buddy(2)] : [buddy(1)],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      },
    }));
    const result = await searchReferralBuddies(" Seoul ", initialBuddySearchCursor);
    expect(result.buddies.map((b) => b.buddyId)).toEqual([1, 2]);
    expect(getAdminBuddies).toHaveBeenCalledTimes(3);
    for (const field of ["displayName", "name", "email"])
      expect(getAdminBuddies).toHaveBeenCalledWith({
        [field]: "Seoul",
        accountStatus: "ACTIVE",
        page: 0,
        size: 20,
      });
    expect(result.next).toBeUndefined();
  });
  it("continues only sources with another page and does not silently truncate matches", async () => {
    vi.mocked(getAdminBuddies).mockResolvedValue({
      status: "success",
      buddies: {
        content: [buddy(5)],
        page: 1,
        size: 20,
        totalElements: 41,
        totalPages: 3,
        hasNext: true,
      },
    });
    const result = await searchReferralBuddies("seoul", {
      displayName: null,
      name: 1,
      email: null,
    });
    expect(getAdminBuddies).toHaveBeenCalledExactlyOnceWith({
      name: "seoul",
      accountStatus: "ACTIVE",
      page: 1,
      size: 20,
    });
    expect(result.next).toEqual({ displayName: null, name: 2, email: null });
  });
  it("fails visibly if any source fails instead of claiming partial search is complete", async () => {
    vi.mocked(getAdminBuddies).mockResolvedValue({ status: "unauthenticated" });
    await expect(searchReferralBuddies("Seoul", initialBuddySearchCursor)).rejects.toThrow();
  });
});
