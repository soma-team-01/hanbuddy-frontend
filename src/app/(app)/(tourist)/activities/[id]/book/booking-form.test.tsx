import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "@/lib/api/applications";
import { applicationKeys } from "@/lib/query/applications";
import { renderWithQueryClient } from "@/test/render-with-query-client";
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
      payment: {
        application: {
          applicationId: 11,
          activityId: 42,
          activityScheduleId: 101,
          activityTitle: "Bukchon Hidden Gems",
          thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
          buddyName: "Jihoon Kim",
          guestCount: 2,
          specialRequest: "Vegetarian snacks, please.",
          startAt: "2026-07-20T10:00:00+09:00",
          price: 45000,
          totalPrice: 90000,
          currency: "KRW",
          status: "PENDING_PAYMENT",
          cancellationReason: null,
          cancellationDetail: null,
          cancelledAt: null,
          createdAt: "2026-07-07T10:00:00Z",
        },
        paymentId: 7,
        paypalOrderId: "5O190127TN364715T",
        approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
        paymentStatus: "CREATED",
        orderExpiresAt: "2026-07-14T13:00:00+09:00",
      },
    });

    const { queryClient } = renderWithQueryClient(<BookingForm activity={activity} />);
    queryClient.setQueryData(applicationKeys.mine(), []);
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
    expect(queryClient.getQueryState(applicationKeys.mine())?.isInvalidated).toBe(true);
  });

  it("does not create an application when the confirmation is cancelled", () => {
    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockedCreateApplication).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
