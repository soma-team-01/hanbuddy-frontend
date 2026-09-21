import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuthRetry } from "./client";
import {
  cancelSchedule,
  getScheduleCancellation,
  getApplicationScheduleCancellation,
} from "./schedule-cancellation";

vi.mock("./client", () => ({ fetchWithAuthRetry: vi.fn() }));
const fetchMock = vi.mocked(fetchWithAuthRetry);

describe("schedule cancellation API", () => {
  beforeEach(() => fetchMock.mockReset());
  it("posts a trimmed public reason to the schedule, not the activity", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ isSuccess: true, result: { activityScheduleId: 71, status: "CANCELLED" } }),
    );
    await cancelSchedule(71, "  unable to attend  ");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/activities/me/schedules/71/cancellation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "unable to attend" }),
      }),
    );
  });
  it("does not equate a successful GET with a cancelled schedule", async () => {
    fetchMock.mockResolvedValue(Response.json({ isSuccess: true, result: { status: "OPEN" } }));
    expect(await getScheduleCancellation(71)).toEqual({
      status: "success",
      cancellation: { status: "OPEN" },
    });
  });
  it("reads a single tourist task without /me in the path", async () => {
    const task = {
      applicationId: 12,
      refundStatus: "EXCLUDED",
      additionalRefundAmount: null,
      currency: null,
    };
    fetchMock.mockResolvedValue(Response.json({ isSuccess: true, result: task }));
    expect(await getApplicationScheduleCancellation(12)).toEqual({
      status: "success",
      cancellation: task,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/12/schedule-cancellation", undefined);
  });
});
