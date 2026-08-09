import type {
  BuddyProfileResponse,
  CreateReviewRequest,
  ReviewPageResponse,
  ReviewResponse,
  UpdateReviewRequest,
} from "@/types/review";
import { requestApiResult, type ApiResult } from "./result";

export type ReviewResult = ApiResult<ReviewResponse, "review">;
export type ReviewPageResult = ApiResult<ReviewPageResponse, "reviews">;
export type BuddyProfileResult = ApiResult<BuddyProfileResponse, "buddy">;
export type DeleteReviewResult = ApiResult<null, "review">;

const DEFAULT_REVIEW_LIST_ERROR_MESSAGE = "후기를 불러오지 못했습니다.";
const DEFAULT_BUDDY_PROFILE_ERROR_MESSAGE = "버디 정보를 불러오지 못했습니다.";
const DEFAULT_REVIEW_SAVE_ERROR_MESSAGE = "후기를 저장하지 못했습니다.";
const DEFAULT_REVIEW_DELETE_ERROR_MESSAGE = "후기를 삭제하지 못했습니다.";

function reviewPagePath(basePath: string, page: number, size: number, rating?: number | null) {
  const ratingQuery = rating ? `&rating=${rating}` : "";
  return `${basePath}?page=${page}&size=${size}${ratingQuery}`;
}

export async function getActivityReviews(
  activityId: number | string,
  page: number,
  size: number,
  /** 1~5. 지정하면 그 별점의 후기만 조회한다 */
  rating?: number | null,
): Promise<ReviewPageResult> {
  return requestApiResult<ReviewPageResponse, "reviews">(
    reviewPagePath(`/api/activities/${activityId}/reviews`, page, size, rating),
    "reviews",
    undefined,
    DEFAULT_REVIEW_LIST_ERROR_MESSAGE,
  );
}

export async function getBuddyReviews(
  buddyId: number | string,
  page: number,
  size: number,
  rating?: number | null,
): Promise<ReviewPageResult> {
  return requestApiResult<ReviewPageResponse, "reviews">(
    reviewPagePath(`/api/buddies/${buddyId}/reviews`, page, size, rating),
    "reviews",
    undefined,
    DEFAULT_REVIEW_LIST_ERROR_MESSAGE,
  );
}

export async function getBuddyProfile(buddyId: number | string): Promise<BuddyProfileResult> {
  return requestApiResult<BuddyProfileResponse, "buddy">(
    `/api/buddies/${buddyId}`,
    "buddy",
    undefined,
    DEFAULT_BUDDY_PROFILE_ERROR_MESSAGE,
  );
}

export async function createReview(request: CreateReviewRequest): Promise<ReviewResult> {
  return requestApiResult<ReviewResponse, "review">(
    "/api/reviews",
    "review",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_REVIEW_SAVE_ERROR_MESSAGE,
  );
}

export async function updateReview(
  reviewId: number | string,
  request: UpdateReviewRequest,
): Promise<ReviewResult> {
  return requestApiResult<ReviewResponse, "review">(
    `/api/reviews/${reviewId}`,
    "review",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    DEFAULT_REVIEW_SAVE_ERROR_MESSAGE,
  );
}

export async function deleteReview(reviewId: number | string): Promise<DeleteReviewResult> {
  return requestApiResult<null, "review">(
    `/api/reviews/${reviewId}`,
    "review",
    { method: "DELETE" },
    DEFAULT_REVIEW_DELETE_ERROR_MESSAGE,
  );
}
