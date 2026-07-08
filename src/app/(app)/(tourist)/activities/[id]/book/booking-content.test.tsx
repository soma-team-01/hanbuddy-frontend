import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTouristActivity } from "@/lib/api/activities";
import { BookingContent } from "./booking-content";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivity: vi.fn(),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
}));

const mockedGetTouristActivity = vi.mocked(getTouristActivity);

describe("BookingContent", () => {
  it("renders booking form with activity detail loaded from the API", async () => {
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Bukchon Hidden Gems",
        description: "Walk through quiet alleys with a local buddy.",
        thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
        buddyId: 7,
        buddyName: "Jihoon Kim",
        buddyProfileImageUrl: null,
        includedItems: [],
        restrictionNotes: [],
        price: 45000,
        currency: "KRW",
        meetingPointName: "Anguk Station Exit 2",
        meetingPointAddress: "Anguk-dong, Jongno-gu, Seoul",
        meetingPlaceId: "ChIJ-bukchon",
        images: [],
        schedules: [
          {
            activityScheduleId: 101,
            activityDate: "2026-07-20",
            startTime: "10:00",
            remainingCapacity: 4,
            status: "OPEN",
          },
        ],
      },
    });

    render(<BookingContent activityId="42" />);

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2026-07-20 10:00" })).toBeInTheDocument();
  });
});
