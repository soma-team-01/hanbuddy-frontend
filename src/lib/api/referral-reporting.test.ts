import { beforeEach, expect, it, vi } from "vitest";
import { getReferralActivities, getReferralApplicants } from "./referral";
import { getAdminBuddies } from "./admin";
import {
  searchReferralActivities,
  getRetainedApplicants,
  getReferralActivityOwner,
  getReferralApplicationDates,
} from "./referral-reporting";
import type { ReferralActivitySummary, ReferralApplicant } from "@/types/referral";
vi.mock("./referral", () => ({ getReferralActivities: vi.fn(), getReferralApplicants: vi.fn() }));
vi.mock("./admin", () => ({ getAdminBuddies: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
});
const page = <T>(content: T[], index = 0, hasNext = false) => ({
  content,
  page: index,
  size: 20,
  totalElements: content.length,
  totalPages: hasNext ? 2 : 1,
  hasNext,
});
it("searches all three account fields and every activity page, including inactive owners", async () => {
  vi.mocked(getAdminBuddies).mockImplementation(async (filters) => ({
    status: "success",
    buddies: page([{ buddyId: filters.email ? 8 : 7 }] as never[]),
  }));
  vi.mocked(getReferralActivities).mockImplementation(async (index = 0) => ({
    status: "success",
    data: page(
      [
        { partnerUserId: index ? 8 : 9, activity: { activityId: index ? 42 : 41 } },
      ] as ReferralActivitySummary[],
      index,
      index === 0,
    ),
  }));
  expect((await searchReferralActivities("studio")).map((row) => row.activity.activityId)).toEqual([
    42,
  ]);
  expect(getAdminBuddies).toHaveBeenCalledTimes(3);
  expect(vi.mocked(getAdminBuddies).mock.calls.every(([filters]) => !filters.accountStatus)).toBe(
    true,
  );
  expect((await getReferralActivityOwner(42)).partnerUserId).toBe(8);
});
it("combines pending, confirmed and completed applications across pages without cancellations", async () => {
  vi.mocked(getReferralApplicants).mockImplementation(async (_admin, params) => {
    const index = Number(params.get("page"));
    const completed = params.get("status") === "COMPLETED";
    const pending = params.get("status") === "PENDING_APPROVAL";
    return {
      status: "success",
      data: page(
        [
          {
            applicationId: completed ? 3 : index + (pending ? 4 : 1),
            status: params.get("status"),
            createdAt: completed ? "2026-09-01" : "2026-10-01",
          },
        ] as ReferralApplicant[],
        index,
        !completed && index === 0,
      ),
    };
  });
  const rows = await getRetainedApplicants(
    new URLSearchParams("activityId=42&scheduleId=12&from=2026-09-01"),
  );
  expect(rows.map((row) => row.applicationId)).toEqual([5, 4, 2, 1, 3]);
  expect(
    vi
      .mocked(getReferralApplicants)
      .mock.calls.every(
        ([admin, params]) =>
          admin && params.get("activityId") === "42" && params.get("scheduleId") === "12",
      ),
  ).toBe(true);
});
it("fails visibly instead of reporting incomplete application totals", async () => {
  vi.mocked(getReferralApplicants).mockResolvedValue({ status: "unauthenticated" });
  await expect(getRetainedApplicants(new URLSearchParams())).rejects.toThrow();
});
it("marks createdAt in KST from every page including cancellations, not scheduled startAt", async () => {
  vi.mocked(getReferralApplicants).mockImplementation(async (_admin, params) => ({
    status: "success",
    data: page(
      [
        {
          createdAt:
            params.get("page") === "0" ? "2026-10-01T16:00:00Z" : "2026-10-03T10:00:00+09:00",
          startAt: "2026-10-20T10:00:00+09:00",
          status: "CANCELLED",
        },
      ] as ReferralApplicant[],
      Number(params.get("page")),
      params.get("page") === "0",
    ),
  }));
  expect(await getReferralApplicationDates(42, "2026-10-01", "2026-10-31")).toEqual([
    "2026-10-02",
    "2026-10-03",
  ]);
  expect(
    vi
      .mocked(getReferralApplicants)
      .mock.calls.every(
        ([admin, params]) =>
          admin &&
          params.get("activityId") === "42" &&
          params.get("from") === "2026-10-01" &&
          params.get("until") === "2026-10-31" &&
          !params.has("status"),
      ),
  ).toBe(true);
});
