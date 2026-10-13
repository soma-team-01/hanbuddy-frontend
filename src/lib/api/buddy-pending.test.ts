import { afterEach, expect, it, vi } from "vitest";
import { getBuddyPendingApprovals } from "./buddy";
import { buddyPendingApprovalsQueryOptions } from "@/lib/query/buddy";
afterEach(() => vi.unstubAllGlobals());
it("uses date-independent pagination and preserves the complete response", async () => {
  const page = { content: [], totalElements: 42, totalPages: 3, page: 1, size: 20, hasNext: true };
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ isSuccess: true, result: page })));
  vi.stubGlobal("fetch", fetcher);
  expect(await getBuddyPendingApprovals(1)).toMatchObject({ status: "success", page });
  expect(fetcher.mock.calls[0][0]).toBe("/api/applications/buddy/pending-approvals?page=1&size=20");
  const options = buddyPendingApprovalsQueryOptions();
  expect(options.queryKey).toEqual(["buddy", "applications", "pending-approvals"]);
  expect(options.refetchInterval).toBe(60000);
  expect(options.getNextPageParam(page, [], 1, [])).toBe(2);
  expect(options.getNextPageParam({ ...page, hasNext: false }, [], 1, [])).toBeUndefined();
});
