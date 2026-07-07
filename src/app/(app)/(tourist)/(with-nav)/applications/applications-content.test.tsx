import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getMyApplications } from "@/lib/api/applications";
import { ApplicationsContent } from "./applications-content";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/api/applications", () => ({
  getMyApplications: vi.fn(),
}));

const mockedGetMyApplications = vi.mocked(getMyApplications);

describe("ApplicationsContent", () => {
  it("renders applications loaded from the API", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          applicationId: 11,
          activityId: 42,
          activityScheduleId: 101,
          activityTitle: "Bukchon Hidden Gems",
          thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
          buddyName: "Jihoon Kim",
          guestCount: 2,
          specialRequest: null,
          activityDate: "2026-07-20",
          startTime: "10:00",
          price: 45000,
          totalPrice: 90000,
          currency: "KRW",
          status: "CONFIRMED",
          cancellationReason: null,
          cancellationDetail: null,
          cancelledAt: null,
          createdAt: "2026-07-07T10:00:00Z",
        },
      ],
    });

    render(<ApplicationsContent />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });
});
