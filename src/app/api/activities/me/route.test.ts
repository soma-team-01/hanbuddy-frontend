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
    const activity = {
      activityId: 7,
      status: "INACTIVE",
      title: "Tea",
      description: "Tea tour",
      totalDurationMinutes: 60,
      thumbnailImageUrl: null,
      meetingPointName: "Anguk",
      meetingPlaceId: null,
      meetingLatitude: 37.5,
      meetingLongitude: 127,
      price: 40000,
      currency: "KRW",
      discountPercent: 2,
      discountEndDate: "2099-12-31",
      discountedPrice: 39200,
      priceTiers: [{ minGuests: 2, maxGuests: null, unitPrice: 30000 }],
      averageRating: 4.8,
      reviewCount: 7,
      isSoldOut: false,
    };
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: [activity] },
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
    expect(await response.json()).toMatchObject({ result: [activity] });
  });
});
