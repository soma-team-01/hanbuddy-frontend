import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMyActivity,
  deleteMyActivity,
  getBuddyActivityApplications,
  getBuddyApplications,
  getBuddyScheduleDates,
  getMyActivities,
  getMyActivity,
  updateMyActivity,
} from "./buddy";
import type { ActivityUpsertRequest } from "@/types/buddy";

const activitySummary = {
  activityId: 7,
  title: "Traditional Tea Tasting",
  description: "Learn Korean tea etiquette.",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/tea.webp",
  status: "ACTIVE",
};

const activityDetail = {
  ...activitySummary,
  includedItems: ["Tea", "Snacks"],
  restrictionNotes: ["No caffeine sensitivity"],
  maxCapacity: 4,
  price: 50000,
  currency: "KRW",
  meetingPointName: "Anguk Station",
  meetingPointAddress: "Jongno-gu, Seoul",
  meetingPlaceId: "place-1",
  images: [{ imageUrl: "https://static.hanbuddy.com/activities/tea.webp", imageOrder: 0 }],
  schedules: [
    {
      scheduleId: 99,
      activityDate: "2026-07-20",
      startTime: "10:00",
      bookedCount: 2,
      status: "OPEN",
    },
  ],
};

const activityRequest: ActivityUpsertRequest = {
  title: "Traditional Tea Tasting",
  description: "Learn Korean tea etiquette.",
  imageKeys: ["activities/2026/07/07/uuid.webp"],
  includedItems: ["Tea", "Snacks"],
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

const applicantSummary = {
  applicationId: 11,
  applicantUserId: 3,
  applicantName: "Sophie Martin",
  applicantProfileImageUrl: null,
  applicantNationalityCode: "FR",
  guestCount: 2,
  applicantContactMethod: "WHATSAPP",
  applicantContactCountryCode: "+33",
  applicantContactIdentifier: "612345678",
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("buddy API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads my activities through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: [activitySummary],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMyActivities()).resolves.toEqual({
      status: "success",
      activities: [activitySummary],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/me", { credentials: "same-origin" });
  });

  it("loads one of my activity details through the internal API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: activityDetail }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMyActivity(7)).resolves.toEqual({
      status: "success",
      activity: activityDetail,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/me/7", { credentials: "same-origin" });
  });

  it("creates a buddy activity through the internal API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse(
          { isSuccess: true, code: "201", message: "created", result: activityDetail },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createMyActivity(activityRequest)).resolves.toEqual({
      status: "success",
      activity: activityDetail,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityRequest),
      credentials: "same-origin",
    });
  });

  it("updates a buddy activity through the internal API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: activityDetail }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateMyActivity(7, activityRequest)).resolves.toEqual({
      status: "success",
      activity: activityDetail,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/me/7", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activityRequest),
      credentials: "same-origin",
    });
  });

  it("deletes a buddy activity through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "deleted",
        result: "삭제되었습니다.",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteMyActivity(7)).resolves.toEqual({
      status: "success",
      message: "삭제되었습니다.",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/me/7", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });

  it("loads buddy schedule dates through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: [{ date: "2026-07-20" }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBuddyScheduleDates()).resolves.toEqual({
      status: "success",
      dates: [{ date: "2026-07-20" }],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/buddy/schedule-dates", {
      credentials: "same-origin",
    });
  });

  it("loads buddy date activity applications through the internal API", async () => {
    const response = {
      activityId: 7,
      activityTitle: "Traditional Tea Tasting",
      thumbnailImageUrl: "https://static.hanbuddy.com/activities/tea.webp",
      applicantCount: 2,
      applicants: [applicantSummary],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: [response] }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBuddyApplications("2026-07-20")).resolves.toEqual({
      status: "success",
      activities: [response],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/buddy?date=2026-07-20", {
      credentials: "same-origin",
    });
  });

  it("loads buddy activity applicant details through the internal API", async () => {
    const response = {
      activityId: 7,
      activityTitle: "Traditional Tea Tasting",
      activityDate: "2026-07-20",
      applicantCount: 2,
      statusCounts: { CONFIRMED: 2 },
      applicants: [
        {
          ...applicantSummary,
          status: "CONFIRMED",
          specialRequest: "No pork",
          appliedAt: "2026-07-07T10:00:00Z",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: response }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBuddyActivityApplications(7, "2026-07-20")).resolves.toEqual({
      status: "success",
      applications: response,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/buddy/activities/7?date=2026-07-20", {
      credentials: "same-origin",
    });
  });
});
