import { describe, expect, it } from "vitest";
import { mapApplicationResponseToApplication } from "./application-view";

const application = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: "Vegetarian snacks, please.",
  startAt: "2026-07-18T16:30:00Z",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  paymentAmount: 68.97,
  paymentCurrency: "USD",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
} as const;

describe("application view adapters", () => {
  it("maps backend application fields to the existing card model", () => {
    expect(mapApplicationResponseToApplication(application, "Time unavailable.", "en")).toEqual({
      id: "11",
      activityId: 42,
      status: "confirmed",
      startAt: "2026-07-18T16:30:00Z",
      thumbnailUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
      cancellationReason: null,
      dateLabel: "Sun, Jul 19 · 1:30 AM",
      hostName: "Jihoon Kim",
      hostAvatarUrl: null,
      activityTitle: "Bukchon Hidden Gems",
      breakdown: {
        unitPrice: 45000,
        guests: 2,
        serviceFee: 0,
      },
      paymentAmount: 68.97,
      paymentCurrency: "USD",
    });
  });

  it("maps cancelled applications into a past-list status", () => {
    expect(
      mapApplicationResponseToApplication(
        {
          ...application,
          status: "CANCELLED",
          cancellationReason: "SCHEDULE_CONFLICT",
        },
        "Time unavailable.",
      ),
    ).toMatchObject({
      status: "cancelled",
      cancellationReason: "SCHEDULE_CONFLICT",
    });
  });

  it("uses the supplied fallback for an invalid application timestamp", () => {
    expect(
      mapApplicationResponseToApplication(
        { ...application, startAt: "2026-07-20T10:00" },
        "Time unavailable.",
      ),
    ).toMatchObject({ dateLabel: "Time unavailable." });
  });

  it("localizes the schedule while preserving user-authored application content", () => {
    expect(
      mapApplicationResponseToApplication(application, "시간 정보를 확인할 수 없습니다.", "ko"),
    ).toMatchObject({
      dateLabel: "7. 19. (일) · 오전 1:30",
      activityTitle: "Bukchon Hidden Gems",
      hostName: "Jihoon Kim",
    });
  });
});
