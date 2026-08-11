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

describe("GET /api/activities/me", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/activities/me"));

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity list with the access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: [] },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/activities/me", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/me", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});
