import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createReview,
  deleteReview,
  getActivityReviews,
  getBuddyProfile,
  getBuddyReviews,
  updateReview,
} from "./reviews";

const review = {
  reviewId: 1,
  applicationId: 10,
  activityId: 42,
  activityTitle: "Bukchon Hidden Gems",
  reviewerName: "Nelli",
  reviewerProfileImageUrl: null,
  rating: 5,
  content: "정말 좋았어요.",
  createdAt: "2026-08-01T13:00:00+09:00",
};

const reviewPage = {
  averageRating: 4.8,
  totalCount: 31,
  reviews: [review],
  page: 0,
  size: 6,
  hasNext: true,
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(createJsonResponse(body, status));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("review API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads activity reviews with pagination", async () => {
    const fetchMock = stubFetch({
      isSuccess: true,
      code: "200",
      message: "ok",
      result: reviewPage,
    });

    await expect(getActivityReviews(42, 1, 6)).resolves.toEqual({
      status: "success",
      reviews: reviewPage,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/activities/42/reviews?page=1&size=6", {
      credentials: "same-origin",
    });
  });

  it("loads buddy reviews and profile through the internal API", async () => {
    const fetchMock = stubFetch({
      isSuccess: true,
      code: "200",
      message: "ok",
      result: reviewPage,
    });
    await getBuddyReviews(6, 0, 6);
    expect(fetchMock).toHaveBeenCalledWith("/api/buddies/6/reviews?page=0&size=6", {
      credentials: "same-origin",
    });

    const profile = {
      buddyId: 6,
      buddyName: "Koa",
      buddyProfileImageUrl: null,
      averageRating: 4.9,
      reviewCount: 67,
      activeActivityCount: 3,
    };
    const profileFetch = stubFetch({
      isSuccess: true,
      code: "200",
      message: "ok",
      result: profile,
    });
    await expect(getBuddyProfile(6)).resolves.toEqual({ status: "success", buddy: profile });
    expect(profileFetch).toHaveBeenCalledWith("/api/buddies/6", { credentials: "same-origin" });
  });

  it("creates, updates, and deletes a review", async () => {
    const createFetch = stubFetch({
      isSuccess: true,
      code: "201",
      message: "created",
      result: review,
    });
    await expect(
      createReview({ applicationId: 10, rating: 5, content: "정말 좋았어요." }),
    ).resolves.toEqual({ status: "success", review });
    expect(createFetch).toHaveBeenCalledWith("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: 10, rating: 5, content: "정말 좋았어요." }),
      credentials: "same-origin",
    });

    const updateFetch = stubFetch({
      isSuccess: true,
      code: "200",
      message: "ok",
      result: { ...review, rating: 4 },
    });
    await updateReview(1, { rating: 4, content: "수정했어요." });
    expect(updateFetch).toHaveBeenCalledWith("/api/reviews/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 4, content: "수정했어요." }),
      credentials: "same-origin",
    });

    const deleteFetch = stubFetch({ isSuccess: true, code: "200", message: "ok", result: null });
    await expect(deleteReview(1)).resolves.toEqual({ status: "success", review: null });
    expect(deleteFetch).toHaveBeenCalledWith("/api/reviews/1", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });

  it("returns structured backend metadata when a duplicate review is rejected", async () => {
    stubFetch(
      {
        isSuccess: false,
        code: "REVIEW409_DUPLICATE",
        message: "이미 리뷰를 작성한 신청입니다.",
      },
      409,
    );

    await expect(
      createReview({ applicationId: 10, rating: 5, content: "또 씁니다." }),
    ).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({ code: "REVIEW409_DUPLICATE", status: 409 }),
    });
  });
});
