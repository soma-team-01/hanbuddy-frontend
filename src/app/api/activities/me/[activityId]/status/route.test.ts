import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { PATCH } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, patchBackend: vi.fn() };
});

const mockedPatchBackend = vi.mocked(patchBackend);
const context = { params: Promise.resolve({ activityId: "42" }) };

describe("PATCH /api/activities/me/[activityId]/status", () => {
  beforeEach(() => mockedPatchBackend.mockReset());

  it("proxies only the requested activity status", async () => {
    mockedPatchBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });
    const request = new NextRequest("http://localhost/api/activities/me/42/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "INACTIVE" }),
      headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
    });

    const response = await PATCH(request, context);

    expect(mockedPatchBackend).toHaveBeenCalledWith(
      "/activities/me/42/status",
      { status: "INACTIVE" },
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("returns 401 without forwarding when unauthenticated", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/activities/me/42/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });

  it("rejects malformed bodies and non-numeric ids", async () => {
    const malformed = await PATCH(
      new NextRequest("http://localhost/api/activities/me/42/status", {
        method: "PATCH",
        body: "not-json",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );
    const invalidId = await PATCH(
      new NextRequest("http://localhost/api/activities/me/nope/status", {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      { params: Promise.resolve({ activityId: "nope" }) },
    );

    expect(malformed.status).toBe(400);
    expect(invalidId.status).toBe(400);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });
});
