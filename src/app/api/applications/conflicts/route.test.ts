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

describe("GET /api/applications/conflicts", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("rejects an invalid schedule id before calling the backend", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/conflicts?activityScheduleId=abc"),
    );

    expect(response.status).toBe(400);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the conflict check with the authenticated tourist", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { blocking: false, conflicts: [], sameDayWarnings: [] },
      },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/applications/conflicts?activityScheduleId=101", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith(
      "/applications/conflicts?activityScheduleId=101",
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });
});
