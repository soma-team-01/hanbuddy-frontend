import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "@/lib/api/applications";
import type { Activity } from "@/types/activity";
import { BookingForm } from "./booking-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
}));

const mockedCreateApplication = vi.mocked(createApplication);

const activity: Activity = {
  id: "42",
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  location: "Anguk Station Exit 2",
  district: "Bukchon",
  categoryLabel: "HanBuddy activity",
  imageUrl: "/images/activities/hanok-hero.jpg",
  heroImageUrl: "/images/activities/hanok-hero.jpg",
  rating: 5,
  reviewCount: 0,
  price: 45000,
  host: {
    name: "Jihoon Kim",
    bio: "Local HanBuddy host",
    avatarUrl: null,
  },
  included: [],
  restrictions: [],
  sessions: [
    {
      id: "101",
      dateLabel: "2026-07-20",
      timeLabel: "10:00",
      spotsLeft: 4,
    },
  ],
  meetingPoint: {
    name: "Anguk Station Exit 2",
    area: "Anguk-dong",
    mapImageUrl: "/images/map-bukchon.jpg",
  },
};

describe("BookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an application for the selected schedule after confirming the summary", async () => {
    mockedCreateApplication.mockResolvedValue({
      status: "success",
      application: {
        applicationId: 11,
        activityId: 42,
        activityScheduleId: 101,
        activityTitle: "Bukchon Hidden Gems",
        thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
        buddyName: "Jihoon Kim",
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
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
    });

    render(<BookingForm activity={activity} />);
    fireEvent.change(screen.getByPlaceholderText("Let your guide know..."), {
      target: { value: "Vegetarian snacks, please." },
    });
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(within(dialog).getByText("2026-07-20 10:00")).toBeInTheDocument();
    expect(within(dialog).getByText("2 guests")).toBeInTheDocument();
    expect(within(dialog).getByText("₩99,000")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(mockedCreateApplication).toHaveBeenCalledWith({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      });
    });
    expect(replace).toHaveBeenCalledWith("/applications");
  });

  it("does not create an application when the confirmation is cancelled", () => {
    render(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockedCreateApplication).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
