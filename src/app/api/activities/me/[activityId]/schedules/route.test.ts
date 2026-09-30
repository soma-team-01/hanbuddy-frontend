import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend, patchBackend, deleteBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";
import { PATCH, DELETE } from "./[scheduleId]/route";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  postBackend: vi.fn(),
  patchBackend: vi.fn(),
  deleteBackend: vi.fn(),
}));
const params = Promise.resolve({ activityId: "42", scheduleId: "101" });
const body = { startAt: "2026-12-10T19:00:00+09:00", maxCapacity: 6 };
const payload = {
  isSuccess: true,
  code: "200",
  message: "ok",
  result: {
    activityId: 42,
    schedules: [{ scheduleId: 101, ...body, remainingCapacity: 2, heldSeats: 1, bookedCount: 3 }],
  },
};

describe("individual schedule BFF contract", () => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    ["POST", POST, postBackend, "/activities/me/42/schedules"],
    ["PATCH", PATCH, patchBackend, "/activities/me/42/schedules/101"],
    ["DELETE", DELETE, deleteBackend, "/activities/me/42/schedules/101"],
  ] as const)(
    "%s retains the complete updated activity response",
    async (method, handler, upstream, path) => {
      vi.mocked(upstream).mockResolvedValue({ status: 200, payload, setCookies: [] });
      const response = await handler(
        new NextRequest(`http://localhost/api${path}`, {
          method,
          headers: { cookie: `${AUTH_COOKIES.accessToken}=token` },
          ...(method === "DELETE" ? {} : { body: JSON.stringify(body) }),
        }),
        { params },
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(payload);
      expect(upstream).toHaveBeenCalledWith(path, ...(method === "DELETE" ? [] : [body]), {
        bearerToken: "token",
      });
    },
  );
  it("does not turn a history-bearing delete into a cancellation", async () => {
    vi.mocked(deleteBackend).mockResolvedValue({
      status: 400,
      payload: {
        isSuccess: false,
        code: "ACTIVITY_SCHEDULE400_HAS_APPLICATIONS",
        message: "cannot delete",
      },
      setCookies: [],
    });
    const response = await DELETE(
      new NextRequest("http://localhost/api/activities/me/42/schedules/101", {
        method: "DELETE",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=token` },
      }),
      { params },
    );
    expect(response.status).toBe(400);
    expect(postBackend).not.toHaveBeenCalled();
  });
});
