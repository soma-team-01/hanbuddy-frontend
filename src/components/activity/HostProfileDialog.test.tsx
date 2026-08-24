import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { HostProfileDialog } from "./HostProfileDialog";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

vi.mock("@/lib/api/reviews", () => ({
  getBuddyProfile: vi.fn(),
  getBuddyReviews: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);
const mockedGetBuddyProfile = vi.mocked(getBuddyProfile);
const mockedGetBuddyReviews = vi.mocked(getBuddyReviews);

describe("HostProfileDialog", () => {
  beforeEach(() => {
    mockedGetTouristActivities.mockResolvedValue({ status: "success", activities: [] });
    mockedGetBuddyProfile.mockResolvedValue({
      status: "success",
      buddy: {
        buddyId: 17,
        buddyName: "Seoul Buddy",
        buddyProfileImageUrl: null,
        averageRating: null,
        reviewCount: 0,
        activeActivityCount: 0,
      },
    });
    mockedGetBuddyReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: null,
        totalCount: 0,
        reviews: [],
        page: 0,
        size: 12,
        hasNext: false,
      },
    });
  });

  it("shows the guest profile sections with a disabled chat action in preview mode", async () => {
    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local HanBuddy host", avatarUrl: null }}
        hostIntroduction="I know this neighborhood well."
        currentActivityId="preview"
        showHostedActivities
        canContact={false}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Experiences hosted by this buddy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Message Seoul Buddy" })).toBeDisabled();
    expect(screen.getByText("I know this neighborhood well.")).toBeInTheDocument();
  });
});
