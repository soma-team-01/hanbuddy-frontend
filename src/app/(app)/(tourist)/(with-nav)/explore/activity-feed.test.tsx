import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { ActivityFeed } from "./activity-feed";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

describe("ActivityFeed", () => {
  it("renders activities loaded from the API", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          title: "Bukchon Hidden Gems",
          description: "Walk through quiet alleys with a local buddy.",
          thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Anguk Station Exit 2",
          price: 45000,
          currency: "KRW",
        },
      ],
    });

    render(<ActivityFeed />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Anguk Station Exit 2")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
  });
});
