import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const context = { params: Promise.resolve({ activityId: "42" }) };

describe("GET /api/applications/buddy/activities/[activityId]", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/buddy/activities/42?date=2026-07-20"),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity application detail with the date query and access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/applications/buddy/activities/42?date=2026-07-20", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedGetBackend).toHaveBeenCalledWith(
      "/applications/buddy/activities/42?date=2026-07-20",
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });
});
