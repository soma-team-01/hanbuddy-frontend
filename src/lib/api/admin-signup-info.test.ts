import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminUser, getAdminBuddy, getBuddyApplicationForAdmin } from "./admin";
import { requestApiResult } from "./result";
vi.mock("./result", () => ({ requestApiResult: vi.fn() }));
describe("sensitive admin details", () => {
  beforeEach(() => vi.mocked(requestApiResult).mockClear());
  it.each([
    [getAdminUser, "/api/admin/users/5", "user"],
    [getAdminBuddy, "/api/admin/buddies/5", "buddy"],
    [getBuddyApplicationForAdmin, "/api/admin/buddy-applications/5", "application"],
  ] as const)(
    "does not persist an admin detail response in the browser HTTP cache",
    (fetchDetail, path, key) => {
      fetchDetail(5);
      expect(requestApiResult).toHaveBeenCalledWith(
        path,
        key,
        { cache: "no-store" },
        expect.any(String),
      );
    },
  );
});
