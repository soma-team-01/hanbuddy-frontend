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
  startAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
} as const;

describe("application view adapters", () => {
  it("maps backend application fields to the existing card model", () => {
    expect(mapApplicationResponseToApplication(application)).toEqual({
      id: "11",
      status: "confirmed",
      dateLabel: "2026-07-20 10:00",
      hostName: "Jihoon Kim",
      hostAvatarUrl: null,
      activityTitle: "Bukchon Hidden Gems",
      breakdown: {
        unitPrice: 45000,
        guests: 2,
        serviceFee: 0,
      },
    });
  });

  it("maps cancelled applications into a past-list status", () => {
    expect(
      mapApplicationResponseToApplication({
        ...application,
        status: "CANCELLED",
        cancellationReason: "SCHEDULE_CONFLICT",
      }),
    ).toMatchObject({
      status: "cancelled",
    });
  });
});
