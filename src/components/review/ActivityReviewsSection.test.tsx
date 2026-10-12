import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
    activityTitleLanguage: "EN",
    reviewerName: `Reviewer ${reviewId}`,
    source: "PLATFORM",
    originalReviewedAt: null,
    reviewerProfileImageUrl: null,
    rating: 5,
    content: `Loved every minute of it (${reviewId}).`,
    contentLanguage: "EN",
    sourceLanguage: "EN",
    originalContent: `Loved every minute of it (${reviewId}).`,
    createdAt: "2026-08-01T13:00:00+09:00",
  };
}

function createPage(page: number, size: number, hasNext: boolean): ReviewPageResponse {
  return {
    averageRating: 4.8,
    totalCount: 31,
    ratingCounts: { "5": 24, "4": 5, "3": 2, "2": 0, "1": 0 },
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

  it("previews three reviews in one column with the average rating and total count", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: createPage(0, 3, true),
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByRole("img", { name: "Rated 4.8 out of 5" })).toBeInTheDocument();
    expect(screen.getByText("31 reviews")).toBeInTheDocument();
    expect(screen.getByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(screen.getByRole("list")).toHaveClass("flex-col");
    expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 3, "EN");
  });

  it("renders the server preview immediately without asking the browser to fetch it", () => {
    renderWithQueryClient(
      <ActivityReviewsSection activityId={42} initialReviews={createPage(0, 3, true)} />,
    );

    // 첫 렌더에서 바로 후기가 보인다(크롤러가 읽는 첫 HTML과 같다). 로딩 문구도, 브라우저 요청도 없다.
    expect(screen.getByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(screen.getByText("31 reviews")).toBeInTheDocument();
    expect(screen.queryByText("Loading reviews...")).not.toBeInTheDocument();
    expect(mockedGetActivityReviews).not.toHaveBeenCalled();
  });

  it("keeps the section and its anchor in place while the server preview is still streaming", () => {
    const { container } = renderWithQueryClient(
      <ActivityReviewsSection
        activityId={42}
        id="reviews"
        initialReviews={new Promise(() => {})}
      />,
    );

    // 후기 응답을 기다리는 동안에도 본문 목차의 #reviews 이동이 깨지지 않게 섹션 틀을 먼저 그린다.
    expect(container.querySelector("section#reviews")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Reviews" })).toBeInTheDocument();
    expect(screen.getByText("Loading reviews...")).toBeInTheDocument();
    expect(mockedGetActivityReviews).not.toHaveBeenCalled();
  });

  it("renders the streamed server preview without asking the browser to fetch it", async () => {
    // use()로 promise를 기다렸다 다시 그리는 과정은 act 안에서 끝까지 진행시킨다.
    await act(async () => {
      renderWithQueryClient(
        <ActivityReviewsSection
          activityId={42}
          initialReviews={Promise.resolve(createPage(0, 3, true))}
        />,
      );
    });

    expect(await screen.findByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(screen.getByText("31 reviews")).toBeInTheDocument();
    expect(mockedGetActivityReviews).not.toHaveBeenCalled();
  });

  it("lets the browser fetch the preview when the server could not stream one", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: createPage(0, 3, false),
    });
    await act(async () => {
      renderWithQueryClient(
        <ActivityReviewsSection activityId={42} initialReviews={Promise.resolve(undefined)} />,
      );
    });

    expect(await screen.findByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 3, "EN");
  });

  it("opens the full list in a dialog that pages twelve at a time", async () => {
    mockedGetActivityReviews.mockImplementation(async (_activityId, page, size) => ({
      status: "success",
      reviews: createPage(page, size, page === 0),
    }));

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    fireEvent.click(await screen.findByRole("button", { name: "Show all 31 reviews" }));

    const dialog = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 12, "EN", null),
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Load more reviews" }));

    await waitFor(() =>
      expect(mockedGetActivityReviews).toHaveBeenLastCalledWith(42, 1, 12, "EN", null),
    );
    expect(await within(dialog).findByText("Loved every minute of it (101).")).toBeInTheDocument();
  });

  it("filters the dialog list by the star level the reader picks", async () => {
    mockedGetActivityReviews.mockImplementation(
      async (_activityId, page, size, _language, rating) => ({
        status: "success",
        reviews: {
          ...createPage(page, size, false),
          totalCount: rating === 5 ? 24 : 31,
          reviews: [createReview(rating === 5 ? 500 : 1)],
        },
      }),
    );

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    fireEvent.click(await screen.findByRole("button", { name: "Show all 31 reviews" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: /Show only 5-star reviews/ }));

    await waitFor(() => expect(mockedGetActivityReviews).toHaveBeenCalledWith(42, 0, 12, "EN", 5));
    expect(await within(dialog).findByText("Loved every minute of it (500).")).toBeInTheDocument();
    // 필터를 걸어도 평균 별점과 분포는 전체 기준으로 남는다
    expect(within(dialog).getByLabelText("Rated 4.8 out of 5")).toBeInTheDocument();
    expect(within(dialog).getByText("24 reviews")).toBeInTheDocument();

    // 필터를 풀면 이미 받아둔 전체 목록 캐시로 돌아간다 (추가 요청 없음)
    fireEvent.click(within(dialog).getByRole("button", { name: "Show all ratings" }));
    expect(await within(dialog).findByText("Loved every minute of it (1).")).toBeInTheDocument();
    expect(within(dialog).getByText("31 reviews")).toBeInTheDocument();
  });

  it("hides the full-list button when the preview already shows everything", async () => {
    mockedGetActivityReviews.mockResolvedValue({
      status: "success",
      reviews: {
        averageRating: 5,
        totalCount: 2,
        reviews: [createReview(1), createReview(2)],
        page: 0,
        size: 3,
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
        size: 3,
        hasNext: false,
      },
    });

    renderWithQueryClient(<ActivityReviewsSection activityId={42} />);

    expect(await screen.findByText("No reviews yet")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Rated/ })).not.toBeInTheDocument();
    // 별점이 없으면 "0 reviews"도 남기지 않는다
    expect(screen.queryByText(/reviews?$/)).not.toBeInTheDocument();
  });
});
