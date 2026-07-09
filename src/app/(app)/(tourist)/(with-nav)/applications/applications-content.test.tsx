import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelMyApplication, getMyApplications } from "@/lib/api/applications";
import type { ApplicationResponse } from "@/types/application";
import { ApplicationsContent } from "./applications-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  cancelMyApplication: vi.fn(),
  getMyApplications: vi.fn(),
}));

const mockedCancelMyApplication = vi.mocked(cancelMyApplication);
const mockedGetMyApplications = vi.mocked(getMyApplications);

const confirmedApplication: ApplicationResponse = {
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
};

describe("ApplicationsContent", () => {
  beforeEach(() => {
    mockedCancelMyApplication.mockReset();
    mockedGetMyApplications.mockReset();
  });

  it("renders applications loaded from the API", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });

    render(<ApplicationsContent />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("cancels a confirmed application and moves it to the Past tab", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });
    mockedCancelMyApplication.mockResolvedValue({
      status: "success",
      application: {
        ...confirmedApplication,
        status: "CANCELLED",
        cancellationReason: "SCHEDULE_CONFLICT",
        cancelledAt: "2026-07-09T10:00:00Z",
      },
    });

    render(<ApplicationsContent />);

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() =>
      expect(mockedCancelMyApplication).toHaveBeenCalledWith("11", "SCHEDULE_CONFLICT"),
    );
    await waitFor(() => expect(screen.queryByText("Bukchon Hidden Gems")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });
});
