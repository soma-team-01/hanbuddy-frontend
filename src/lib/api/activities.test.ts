import { afterEach, describe, expect, it, vi } from "vitest";
import { getActivityWeather, getTouristActivities, getTouristActivity } from "./activities";

const activitySummary = {
  activityId: 42,
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  buddyProfileImageUrl: "https://static.hanbuddy.com/profiles/jihoon.webp",
  meetingPointName: "Anguk Station Exit 2",
  price: 45000,
  currency: "KRW",
};

const activityDetail = {
  ...activitySummary,
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon-hero.webp",
  buddyId: 7,
  includedItems: ["Local guide", "Tea tasting"],
  restrictionNotes: ["Not recommended for wheelchairs"],
  meetingPlaceId: "ChIJ-bukchon",
  images: [
    {
      imageUrl: "https://static.hanbuddy.com/activities/bukchon-hero.webp",
      imageOrder: 0,
    },
  ],
  schedules: [
    {
      activityScheduleId: 101,
      startAt: "2026-07-20T10:00:00+09:00",
      remainingCapacity: 4,
      status: "OPEN",
    },
  ],
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("tourist activity API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the tourist activity list through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: [activitySummary],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTouristActivities()).resolves.toEqual({
      status: "success",
      activities: [activitySummary],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities", { credentials: "same-origin" });
  });

  it("loads a tourist activity detail through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: activityDetail,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTouristActivity(42)).resolves.toEqual({
      status: "success",
      activity: activityDetail,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/42", {
      credentials: "same-origin",
    });
  });

  it("loads activity weather through the internal API", async () => {
    const weather = {
      available: true,
      unavailableReason: null,
      provider: "KMA",
      timeZone: "Asia/Seoul",
      issuedAt: "2026-08-24T14:00:00+09:00",
      baseDate: "2026-08-24",
      forecasts: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: weather }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getActivityWeather(42)).resolves.toEqual({
      status: "success",
      weather,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/42/weather", {
      credentials: "same-origin",
    });
  });

  it("reports unauthenticated when the activity request remains unauthorized", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ isSuccess: false }, 401))
      .mockResolvedValueOnce(createJsonResponse({ isSuccess: false }, 401));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTouristActivities()).resolves.toEqual({ status: "unauthenticated" });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
  });
});
