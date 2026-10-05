import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET as application } from "@/app/api/applications/[applicationId]/cancellation-translation/route";
import { GET as schedule } from "@/app/api/activity-schedules/[scheduleId]/cancellation-translation/route";
import { GET as languages } from "@/app/api/activities/languages/route";
import { ACTIVITY_LANGUAGES } from "@/types/activity-language";

vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
}));
const backend = vi.mocked(getBackend);
const params = { params: Promise.resolve({ applicationId: "42" }) };
const req = (query = "?language=EN", signedIn = true) =>
  new NextRequest(`http://localhost/api/applications/42/cancellation-translation${query}`, {
    headers: signedIn ? { Cookie: `${AUTH_COOKIES.accessToken}=token` } : {},
  });
beforeEach(() => {
  backend.mockReset();
  backend.mockResolvedValue({
    status: 200,
    payload: { isSuccess: true, code: "200", message: "ok", result: {} },
    setCookies: [],
  });
});

describe("#203 BFF contracts", () => {
  it("allows anonymous language catalog requests", async () => {
    backend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: ACTIVITY_LANGUAGES },
      setCookies: [],
    });
    const response = await languages(req("", false));
    expect(backend).toHaveBeenCalledWith("/activities/languages");
    expect((await response.json()).result).toHaveLength(11);
  });
  it("requires authentication and marks even errors no-store", async () => {
    const response = await application(req("?language=EN", false), params);
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(backend).not.toHaveBeenCalled();
  });
  it.each(["", "?language=UNKNOWN", "?language=YUE", "?language=ZH"])(
    "rejects unsupported/missing language %s",
    async (query) => {
      expect((await application(req(query), params)).status).toBe(400);
      expect(backend).not.toHaveBeenCalled();
    },
  );
  it("forwards only the application ID and supported target, not client-supplied text", async () => {
    const response = await application(req("?language=ZH_HANT&userId=999&reason=secret"), params);
    expect(backend).toHaveBeenCalledWith(
      "/applications/42/cancellation-translation?language=ZH_HANT",
      { bearerToken: "token" },
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("uses the distinct schedule translation route", async () => {
    await schedule(req(), { params: Promise.resolve({ scheduleId: "71" }) });
    expect(backend).toHaveBeenCalledWith(
      "/activity-schedules/71/cancellation-translation?language=EN",
      { bearerToken: "token" },
    );
  });
  it.each([403, 404])(
    "preserves backend %s without leaking the response to logs",
    async (status) => {
      backend.mockResolvedValue({
        status,
        payload: { isSuccess: false, code: "error", message: "denied" },
        setCookies: [],
      });
      expect((await application(req(), params)).status).toBe(status);
    },
  );
  it("does not log upstream errors which might include private text", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    backend.mockRejectedValue(new Error("private text"));
    expect((await application(req(), params)).status).toBe(502);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
