import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET, POST } from "./route";
import { GET as travelerGET } from "@/app/api/applications/[applicationId]/schedule-cancellation/route";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
  postBackend: vi.fn(),
}));
const context = { params: Promise.resolve({ scheduleId: "99" }) };
function request(body?: string, authenticated = true) {
  return new NextRequest("http://localhost/api/test", {
    method: body === undefined ? "GET" : "POST",
    body,
    headers: authenticated ? { cookie: `${AUTH_COOKIES.accessToken}=token` } : {},
  });
}
const result = {
  activityScheduleId: 99,
  status: "CANCELLED",
  reason: "Weather",
  cancelledAt: "2026-09-15T12:00:00+09:00",
  applicants: [],
};
const success = {
  status: 200,
  payload: { isSuccess: true, code: "200", message: "ok", result },
  setCookies: [],
};

describe("schedule cancellation BFF", () => {
  beforeEach(() => {
    vi.mocked(getBackend).mockReset().mockResolvedValue(success);
    vi.mocked(postBackend).mockReset().mockResolvedValue(success);
  });
  it("forwards a trimmed public reason using schedule id and bearer authentication", async () => {
    expect(
      (await POST(request(JSON.stringify({ reason: " Weather ", status: "OPEN" })), context))
        .status,
    ).toBe(200);
    expect(postBackend).toHaveBeenCalledWith(
      "/activities/me/schedules/99/cancellation",
      { reason: "Weather" },
      { bearerToken: "token" },
    );
  });
  it.each([
    "null",
    "[]",
    "not-json",
    "{}",
    '{"reason":5}',
    '{"reason":"  "}',
    JSON.stringify({ reason: "a".repeat(256) }),
  ])("rejects invalid reason payload %s", async (body) => {
    expect((await POST(request(body), context)).status).toBe(400);
    expect(postBackend).not.toHaveBeenCalled();
  });
  it("rejects invalid ids and unauthenticated reads/writes", async () => {
    expect((await GET(request(), { params: Promise.resolve({ scheduleId: "../1" }) })).status).toBe(
      400,
    );
    expect((await GET(request(undefined, false), context)).status).toBe(401);
    expect((await POST(request('{"reason":"Weather"}', false), context)).status).toBe(401);
    expect(getBackend).not.toHaveBeenCalled();
    expect(postBackend).not.toHaveBeenCalled();
  });
  it("returns the authoritative schedule status and forwards backend rejection", async () => {
    expect(await (await GET(request(), context)).json()).toEqual(success.payload);
    expect(getBackend).toHaveBeenCalledWith("/activities/me/schedules/99/cancellation", {
      bearerToken: "token",
    });
    vi.mocked(postBackend).mockResolvedValue({
      status: 400,
      payload: {
        isSuccess: false,
        code: "SCHEDULE400_STARTED",
        message: "Already started",
        result: null,
      },
      setCookies: [],
    });
    const response = await POST(request('{"reason":"Weather"}'), context);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("SCHEDULE400_STARTED");
  });
  it("uses the applicant-owned endpoint without /me and preserves its single-task result", async () => {
    const task = {
      applicationId: 7,
      refundStatus: "EXCLUDED",
      reviewReason: null,
      additionalRefundAmount: null,
      currency: null,
    };
    vi.mocked(getBackend).mockResolvedValue({
      ...success,
      payload: { ...success.payload, result: task },
    });
    const response = await travelerGET(request(), {
      params: Promise.resolve({ applicationId: "7" }),
    });
    expect(getBackend).toHaveBeenCalledWith("/applications/7/schedule-cancellation", {
      bearerToken: "token",
    });
    expect((await response.json()).result).toEqual(task);
  });
});
