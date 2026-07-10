import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelMyApplication, createApplication, getMyApplications } from "./applications";

const application = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: "Vegetarian snacks, please.",
  startAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("application API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates an application through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: true,
          code: "201",
          message: "created",
          result: application,
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createApplication({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      }),
    ).resolves.toEqual({ status: "success", application });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      }),
      credentials: "same-origin",
    });
  });

  it("loads my applications through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: [application],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMyApplications()).resolves.toEqual({
      status: "success",
      applications: [application],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me", {
      credentials: "same-origin",
    });
  });

  it("cancels my application through the internal API", async () => {
    const cancelled = {
      ...application,
      status: "CANCELLED",
      cancellationReason: "SCHEDULE_CONFLICT",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: cancelled,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelMyApplication(11, "SCHEDULE_CONFLICT")).resolves.toEqual({
      status: "success",
      application: cancelled,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/cancel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellationReason: "SCHEDULE_CONFLICT" }),
      credentials: "same-origin",
    });
  });

  it("returns the backend error message when application creation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: false,
          code: "APPLICATION400_CAPACITY_EXCEEDED",
          message: "남은 자리가 부족합니다.",
        },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApplication({ activityScheduleId: 101, guestCount: 9 })).resolves.toEqual({
      status: "error",
      message: "남은 자리가 부족합니다.",
    });
  });
});
