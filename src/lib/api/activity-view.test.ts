import { describe, expect, it } from "vitest";
import {
  mapTouristActivityDetailToActivity,
  mapTouristActivitySummaryToActivity,
} from "./activity-view";

const summary = {
  activityId: 42,
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  thumbnailImageUrl:
    "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/activities/2026/07/07/bukchon.webp",
  buddyName: "Jihoon Kim",
  buddyProfileImageUrl:
    "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/profiles/2026/07/07/jihoon.webp",
  meetingPointName: "Anguk Station Exit 2",
  meetingPlaceId: "ChIJ-bukchon",
  price: 45000,
  currency: "KRW",
};

describe("activity view adapters", () => {
  it("maps a tourist activity summary to the existing card model", () => {
    expect(mapTouristActivitySummaryToActivity(summary)).toMatchObject({
      id: "42",
      title: "Bukchon Hidden Gems",
      imageUrl: summary.thumbnailImageUrl,
      heroImageUrl: summary.thumbnailImageUrl,
      location: "Anguk Station Exit 2",
      host: {
        name: "Jihoon Kim",
        avatarUrl: summary.buddyProfileImageUrl,
      },
      meetingPoint: {
        placeId: "ChIJ-bukchon",
      },
      price: 45000,
    });
  });

  it("maps a tourist activity detail schedule ids for booking", () => {
    const activity = mapTouristActivityDetailToActivity(
      {
        ...summary,
        buddyId: 7,
        includedItems: ["Local guide", "Tea tasting"],
        restrictionNotes: ["Not recommended for wheelchairs"],
        images: [
          {
            imageUrl: "https://static.hanbuddy.com/activities/bukchon-1.webp",
            imageOrder: 1,
          },
          {
            imageUrl: "https://static.hanbuddy.com/activities/bukchon-0.webp",
            imageOrder: 0,
          },
        ],
        schedules: [
          {
            activityScheduleId: 101,
            startAt: "2026-07-18T16:30:00Z",
            remainingCapacity: 4,
            status: "OPEN",
          },
        ],
      },
      "Time unavailable.",
    );

    expect(activity.heroImageUrl).toBe("https://static.hanbuddy.com/activities/bukchon-0.webp");
    expect(activity.included).toEqual([
      { label: "Local guide", provided: true },
      { label: "Tea tasting", provided: true },
    ]);
    expect(activity.sessions).toEqual([
      {
        id: "101",
        dateLabel: "2026-07-19",
        timeLabel: "01:30",
        spotsLeft: 4,
      },
    ]);
    expect(activity.meetingPoint).toMatchObject({
      name: "Anguk Station Exit 2",
      area: "Anguk Station Exit 2",
      placeId: "ChIJ-bukchon",
    });
  });

  it("uses the supplied fallback for an invalid schedule timestamp", () => {
    const activity = mapTouristActivityDetailToActivity(
      {
        ...summary,
        buddyId: 7,
        includedItems: [],
        restrictionNotes: [],
        images: [],
        schedules: [
          {
            activityScheduleId: 101,
            startAt: "2026-07-20T10:00",
            remainingCapacity: 4,
            status: "OPEN",
          },
        ],
      },
      "Time unavailable.",
    );

    expect(activity.sessions[0]).toMatchObject({
      dateLabel: "Time unavailable.",
      timeLabel: "",
    });
  });
});
