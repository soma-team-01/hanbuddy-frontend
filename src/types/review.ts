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

export interface ReviewPageResponse {
  /** 전체 리뷰 기준 평균 별점 (소수 첫째 자리). 리뷰가 없으면 null */
  averageRating: number | null;
  /** 페이지와 무관한 전체 리뷰 수 */
  totalCount: number;
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
