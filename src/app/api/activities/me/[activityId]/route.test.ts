import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteBackend, getBackend, patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return {
    ...actual,
    deleteBackend: vi.fn(),
    getBackend: vi.fn(),
    patchBackend: vi.fn(),
  };
});

const mockedDeleteBackend = vi.mocked(deleteBackend);
const mockedGetBackend = vi.mocked(getBackend);
const mockedPatchBackend = vi.mocked(patchBackend);
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
  meetingPointAddress: "Jongno-gu, Seoul",
  meetingPlaceId: "place-1",
  status: "ACTIVE",
  schedules: [{ activityDate: "2026-07-20", startTime: "10:00" }],
};
const context = { params: Promise.resolve({ activityId: "42" }) };

describe("GET /api/activities/me/[activityId]", () => {
  beforeEach(() => {
    mockedDeleteBackend.mockReset();
    mockedGetBackend.mockReset();
    mockedPatchBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/activities/me/42"), context);

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity detail with the access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/activities/me/42", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/activities/me/42", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/activities/me/[activityId]", () => {
  beforeEach(() => {
    mockedDeleteBackend.mockReset();
    mockedGetBackend.mockReset();
    mockedPatchBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/activities/me/42", {
        method: "PATCH",
        body: JSON.stringify(activityRequest),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity update with the access token as bearer", async () => {
    mockedPatchBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { activityId: 42 } },
      setCookies: [],
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/activities/me/42", {
        method: "PATCH",
        body: JSON.stringify(activityRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPatchBackend).toHaveBeenCalledWith("/activities/me/42", activityRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/activities/me/[activityId]", () => {
  beforeEach(() => {
    mockedDeleteBackend.mockReset();
    mockedGetBackend.mockReset();
    mockedPatchBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/activities/me/42", { method: "DELETE" }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedDeleteBackend).not.toHaveBeenCalled();
  });

  it("proxies the buddy activity deletion with the access token as bearer", async () => {
    mockedDeleteBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "deleted", result: "삭제되었습니다." },
      setCookies: [],
    });

    const response = await DELETE(
      new NextRequest("http://localhost/api/activities/me/42", {
        method: "DELETE",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedDeleteBackend).toHaveBeenCalledWith("/activities/me/42", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});
