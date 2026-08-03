import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { RecommendedExperiences } from "./RecommendedExperiences";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

function createActivity(activityId: number) {
  return {
    activityId,
    title: `HanBuddy activity ${activityId}`,
    description: "A personal Korean experience.",
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
    buddyName: "HanBuddy buddy",
    buddyProfileImageUrl: null,
    meetingPointName: "Anguk Station",
    meetingPlaceId: "place-1",
    price: 45000,
    currency: "KRW",
  };
}

describe("RecommendedExperiences", () => {
  beforeEach(() => {
    mockedGetTouristActivities.mockReset();
  });

  it("renders up to four activities from the tourist activity list", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [1, 2, 3, 4].map(createActivity),
    });

    renderWithQueryClient(<RecommendedExperiences />);

    expect(await screen.findByText("HanBuddy activity 1")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("link", { name: /HanBuddy activity 1/ })).toHaveAttribute(
      "href",
      "/en/activities/1",
    );
    expect(screen.getByText("HanBuddy activity 4")).toBeInTheDocument();
  });
});
