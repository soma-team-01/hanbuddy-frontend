import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivityReviews } from "@/lib/api/reviews";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ReviewPageResponse, ReviewResponse } from "@/types/review";
import { ActivityReviewsSection } from "./ActivityReviewsSection";

vi.mock("@/lib/api/reviews", () => ({
  getActivityReviews: vi.fn(),
}));

const mockedGetActivityReviews = vi.mocked(getActivityReviews);

function createReview(reviewId: number): ReviewResponse {
  return {
    reviewId,
    applicationId: reviewId + 100,
    activityId: 42,
    activityTitle: "Bukchon Hidden Gems",
    reviewerName: `Reviewer ${reviewId}`,
    reviewerProfileImageUrl: null,
    rating: 5,
    content: `Loved every minute of it (${reviewId}).`,
    createdAt: "2026-08-01T13:00:00+09:00",
  };
}

function createPage(page: number, size: number, hasNext: boolean): ReviewPageResponse {
  return {
    averageRating: 4.8,
    totalCount: 31,
    reviews: Array.from({ length: 2 }, (_, index) => createReview(page * 100 + index + 1)),
    page,
    size,
    hasNext,
  };
}

describe("ActivityReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("previews six reviews with the average rating and total count", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: createPage(0, 6, true),
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByLabelText("Rated 4.8 out of 5")).toBeInTheDocument();
    expect(screen.getByText("31 reviews")).toBeInTheDocument();
    expect(screen.getByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 6);
  });

  it("opens the full list in a dialog that pages twelve at a time", async () => {
    mockedGetActivityReviews.mockImplementation(async (_activityId, page, size) => ({
      status: "success",
      reviews: createPage(page, size, page === 0),
    }));

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    fireEvent.click(await screen.findByRole("button", { name: "Show all 31 reviews" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 12));

    fireEvent.click(within(dialog).getByRole("button", { name: "Load more reviews" }));

    await waitFor(() => expect(mockedGetActivityReviews).toHaveBeenLastCalledWith(42, 1, 12));
    expect(await within(dialog).findByText("Loved every minute of it (101).")).toBeInTheDocument();
  });

  it("hides the full-list button when the preview already shows everything", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: 5,
        totalCount: 2,
        reviews: [createReview(1), createReview(2)],
        page: 0,
        size: 6,
        hasNext: false,
      },
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("invites the first review when the activity has none", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: null,
        totalCount: 0,
        reviews: [],
        page: 0,
        size: 6,
        hasNext: false,
      },
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument();
  });
});
