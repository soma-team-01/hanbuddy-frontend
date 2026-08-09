import { fireEvent, screen, waitFor } from "@testing-library/react";
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

function createPage(page: number, hasNext: boolean): ReviewPageResponse {
  return {
    averageRating: 4.8,
    totalCount: 8,
    reviews: [createReview(page * 2 + 1), createReview(page * 2 + 2)],
    page,
    size: 6,
    hasNext,
  };
}

describe("ActivityReviewsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the average rating and the total review count", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: createPage(0, false),
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByLabelText("Rated 4.8 out of 5")).toBeInTheDocument();
    expect(screen.getByText("8 reviews")).toBeInTheDocument();
    expect(screen.getByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/ })).not.toBeInTheDocument();
  });

  it("appends the next page when the reader asks for every review", async () => {
    mockedGetActivityReviews.mockImplementation(async (_activityId, page) => ({
      status: "success",
      reviews: createPage(page, page === 0),
    }));

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    const showAll = await screen.findByRole("button", { name: "Show all 8 reviews" });
    fireEvent.click(showAll);

    await waitFor(() => {
      expect(screen.getByText("Loved every minute of it (3).")).toBeInTheDocument();
    });
    expect(screen.getByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(mockedGetActivityReviews).toHaveBeenLastCalledWith(42, 1, 6);
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
