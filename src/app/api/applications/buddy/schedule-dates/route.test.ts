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

describe("GET /api/applications/buddy/schedule-dates", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/buddy/schedule-dates"),
    );

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy schedule dates with the access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: [] },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/applications/buddy/schedule-dates", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/applications/buddy/schedule-dates", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });

  it("passes the requested range through to the backend", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: [] },
      setCookies: [],
    });

    await GET(
      new NextRequest(
        "http://localhost/api/applications/buddy/schedule-dates?from=2026-08-01&to=2026-08-31",
        { headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` } },
      ),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith(
      "/applications/buddy/schedule-dates?from=2026-08-01&to=2026-08-31",
      { bearerToken: "access-token" },
    );
  });

  it("rejects malformed range values before they reach the backend", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/buddy/schedule-dates?from=notadate", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });
});
