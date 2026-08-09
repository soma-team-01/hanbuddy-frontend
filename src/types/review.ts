export interface ReviewResponse {
  reviewId: number;
  applicationId: number;
  activityId: number;
  activityTitle: string;
  reviewerName: string;
  reviewerProfileImageUrl: string | null;
  /** 1~5 정수 */
  rating: number;
  content: string;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  createdAt: string;
}

/** 신청 응답에 함께 내려오는 "내가 이 신청에 남긴 리뷰" */
export interface MyReviewResponse {
  reviewId: number;
  /** 1~5 정수 */
  rating: number;
  content: string;
  /** Asia/Seoul 오프셋을 포함한 date-time */
  createdAt: string;
}

/** 별점별 리뷰 수. 1~5 키가 항상 모두 내려오며 해당 별점이 없으면 0 */
export type ReviewRatingCounts = Record<string, number>;

export interface ReviewPageResponse {
  /** 평균 별점 (소수 첫째 자리). 별점 필터와 무관하게 항상 전체 기준이며, 리뷰가 없으면 null */
  averageRating: number | null;
  /** 조회된 리뷰 수. 별점 필터를 걸면 필터된 개수이며 페이지네이션 기준이 된다 */
  totalCount: number;
  /** 별점 분포. 필터와 무관하게 항상 전체 기준이라 필터 중에도 막대를 그대로 그린다 */
  ratingCounts?: ReviewRatingCounts;
  reviews: ReviewResponse[];
  page: number;
  size: number;
  hasNext: boolean;
}

export interface BuddyProfileResponse {
  buddyId: number;
  buddyName: string;
  buddyProfileImageUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  /** 현재 공개 중인 활동 수 */
  activeActivityCount: number;
}

export interface CreateReviewRequest {
  applicationId: number;
  /** 1~5 정수 */
  rating: number;
  /** 1~1000자 */
  content: string;
}

export interface UpdateReviewRequest {
  rating: number;
  content: string;
}
