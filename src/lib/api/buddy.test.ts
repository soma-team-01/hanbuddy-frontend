import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMyActivity,
  deleteMyActivity,
  getBuddyActivityApplications,
  getBuddyApplications,
  getBuddyScheduleDates,
  getMyActivities,
  getMyActivity,
  previewActivityPrice,
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
  meetingPlaceId: "place-1",
  images: [{ imageUrl: "https://static.hanbuddy.com/activities/tea.webp", imageOrder: 0 }],
  schedules: [
    {
      scheduleId: 99,
      startAt: "2026-07-20T10:00:00+09:00",
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
  meetingPlaceId: "place-1",
  status: "ACTIVE",
  schedules: [{ startAt: "2026-07-20T10:00:00+09:00" }],
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

  it("previews the buddy payout through the internal API", async () => {
    const preview = {
      unitPriceKrw: 50000,
      currency: "KRW",
      commissionRate: 0.1,
      platformCommissionAmountKrw: 5000,
      estimatedGuidePayoutAmountKrw: 45000,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: preview }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(previewActivityPrice({ price: 50000, currency: "KRW" })).resolves.toEqual({
      status: "success",
      preview,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/price-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: 50000, currency: "KRW" }),
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
        result: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getBuddyScheduleDates()).resolves.toEqual({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
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
      totalApplicantCount: 2,
      schedules: [
        {
          activityScheduleId: 99,
          startAt: "2026-07-20T10:00:00+09:00",
          applicantCount: 2,
          applicants: [applicantSummary],
        },
      ],
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

  it("loads buddy schedule applicant details through the internal API", async () => {
    const response = {
      activityId: 7,
      activityScheduleId: 99,
      activityTitle: "Traditional Tea Tasting",
      startAt: "2026-07-20T10:00:00+09:00",
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

    await expect(getBuddyActivityApplications(99)).resolves.toEqual({
      status: "success",
      applications: response,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/buddy/schedules/99", {
      credentials: "same-origin",
    });
  });
});
