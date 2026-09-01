import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { getBuddyProfile, getBuddyReviews } from "@/lib/api/reviews";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { createKrwDisplayPrice } from "@/test/fixtures/display-price";
import type { ActivityDisplayPrice } from "@/types/display-currency";
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

function createActivity(
  activityId: number,
  buddyId = 17,
  displayPrice: ActivityDisplayPrice = createKrwDisplayPrice(45000),
) {
  return {
    activityId,
    buddyId,
    title: `Activity ${activityId}`,
    description: "A local experience.",
    thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
    buddyName: "Seoul Buddy",
    buddyProfileImageUrl: null,
    meetingPointName: "Anguk Station",
    meetingPlaceId: "place-1",
    price: 45000,
    currency: "KRW",
    displayPrice,
  };
}

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

    expect(await screen.findByText("Other experiences from this buddy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Message Seoul Buddy" })).toBeDisabled();
    expect(screen.getByText("I know this neighborhood well.")).toBeInTheDocument();
    expect(mockedGetTouristActivities).toHaveBeenCalledWith("EN", "USD");
  });

  it("does not repeat the activity currently being previewed", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        createActivity(42),
        createActivity(43, 17, {
          price: 32.5,
          discountedPrice: null,
          currency: "USD",
          exchangeRateDate: "2026-08-31",
          estimated: true,
        }),
        createActivity(44, 99),
      ],
    });

    renderWithQueryClient(
      <HostProfileDialog
        host={{ id: 17, name: "Seoul Buddy", bio: "Local HanBuddy host", avatarUrl: null }}
        currentActivityId="42"
        showHostedActivities
        canContact={false}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText("Activity 43")).toBeInTheDocument();
    expect(screen.queryByText("Activity 42")).not.toBeInTheDocument();
    expect(screen.queryByText("Activity 44")).not.toBeInTheDocument();
    const hostedActivityLink = screen.getByRole("link", { name: /Activity 43/ });
    expect(within(hostedActivityLink).getByText("₩45,000 per person")).toBeInTheDocument();
    expect(within(hostedActivityLink).getByText("≈ $32.50")).toBeInTheDocument();
  });
});
