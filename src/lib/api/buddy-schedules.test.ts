import { afterEach, describe, expect, it, vi } from "vitest";
import { createActivitySchedule, updateActivitySchedule, deleteActivitySchedule } from "./buddy";

describe("buddy schedule client", () => {
  afterEach(() => vi.unstubAllGlobals());
  it.each(["POST", "PATCH", "DELETE"] as const)(
    "preserves the updated activity after %s",
    async (method) => {
      const activity = {
        activityId: 42,
        schedules: [
          { scheduleId: 101, maxCapacity: 8, bookedCount: 3, heldSeats: 1, remainingCapacity: 4 },
        ],
      };
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ isSuccess: true, result: activity }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const body = { startAt: "2026-12-10T19:00:00+09:00", maxCapacity: 8 };
      const result = await (method === "POST"
        ? createActivitySchedule(42, body)
        : method === "PATCH"
          ? updateActivitySchedule(42, 101, body)
          : deleteActivitySchedule(42, 101));
      expect(result).toEqual({ status: "success", activity });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`/api/activities/me/42/schedules${method === "POST" ? "" : "/101"}`);
      expect(init).toMatchObject({ method, credentials: "same-origin" });
      if (method === "DELETE") expect(init.body).toBeUndefined();
      else expect(JSON.parse(init.body)).toEqual(body);
    },
  );
});
