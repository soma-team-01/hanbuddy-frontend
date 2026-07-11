import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET, POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn(), postBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const mockedPostBackend = vi.mocked(postBackend);
const activityRequest = {
  title: "Traditional Tea Tasting",
  description: "Learn Korean tea etiquette.",
  imageKeys: ["activities/2026/07/07/uuid.webp"],
  includedItems: ["Tea"],
  restrictionNotes: [],
  maxCapacity: 4,
  price: 50000,
  currency: "KRW",
  meetingPointName: "Anguk Station",
  meetingPlaceId: "place-1",
  status: "ACTIVE",
  schedules: [{ startAt: "2026-07-20T10:00:00+09:00" }],
};

describe("GET /api/activities", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/activities"));

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the tourist activity list with the access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: [] },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/activities", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});

describe("POST /api/activities", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/activities", {
        method: "POST",
        body: JSON.stringify(activityRequest),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity creation with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 201,
      payload: { isSuccess: true, code: "201", message: "created", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/activities", {
        method: "POST",
        body: JSON.stringify(activityRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith("/activities", activityRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(201);
  });
});
