import { isValidReviewRating } from "./review-input";

const MAX_REVIEW_PAGE_SIZE = 50;

/**
 * 리뷰 목록 조회 쿼리를 정규화해 백엔드로 넘긴다.
 * page·size는 정수로 맞추고, rating은 1~5 정수일 때만 통과시킨다.
 */
export function buildReviewPageQuery(searchParams: URLSearchParams): string {
  const page = Number(searchParams.get("page"));
  const size = Number(searchParams.get("size"));
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
  const safeSize = Number.isInteger(size) && size > 0 ? Math.min(size, MAX_REVIEW_PAGE_SIZE) : 10;

  const rawRating = searchParams.get("rating");
  const rating = rawRating === null ? null : Number(rawRating);
  const ratingQuery = rating !== null && isValidReviewRating(rating) ? `&rating=${rating}` : "";

  return `?page=${safePage}&size=${safeSize}${ratingQuery}`;
}
