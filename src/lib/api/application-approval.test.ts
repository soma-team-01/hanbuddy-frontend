import { afterEach, expect, it, vi } from "vitest";
import { approveApplication, rejectApplication } from "./application-approval";

afterEach(() => vi.unstubAllGlobals());
it("approves by application ID without a body and accepts a result-less envelope", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ isSuccess: true, code: "200" }));
  vi.stubGlobal("fetch", fetch);
  await expect(approveApplication(123)).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith(
    "/api/applications/123/buddy/approve",
    expect.objectContaining({ method: "POST" }),
  );
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
});
it("uses reason/detail, trims OTHER, and omits detail for fixed reasons", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ isSuccess: true }));
  vi.stubGlobal("fetch", fetch);
  await rejectApplication(123, { reason: "BUDDY_OTHER", detail: "  unavailable  " });
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    reason: "BUDDY_OTHER",
    detail: "unavailable",
  });
  fetch.mockResolvedValue(Response.json({ isSuccess: true }));
  await rejectApplication(123, { reason: "BOOKING_UNAVAILABLE", detail: "stale text" });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ reason: "BOOKING_UNAVAILABLE" });
});
it.each(["   ", "x".repeat(256)])(
  "rejects invalid custom reasons before sending",
  async (detail) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(rejectApplication(123, { reason: "BUDDY_OTHER", detail })).rejects.toMatchObject({
      code: "APPLICATION400_REJECTION",
    });
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("preserves the server expired error", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { isSuccess: false, code: "APPLICATION409_APPROVAL_EXPIRED" },
          { status: 409 },
        ),
      ),
  );
  await expect(approveApplication(123)).rejects.toMatchObject({
    code: "APPLICATION409_APPROVAL_EXPIRED",
  });
});
