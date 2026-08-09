const MAX_REVIEW_PAGE_SIZE = 50;

/** 리뷰 목록 조회의 page·size만 정수로 정규화해 백엔드로 넘긴다 */
export function buildReviewPageQuery(searchParams: URLSearchParams): string {
  const page = Number(searchParams.get("page"));
  const size = Number(searchParams.get("size"));
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
  const safeSize = Number.isInteger(size) && size > 0 ? Math.min(size, MAX_REVIEW_PAGE_SIZE) : 10;

  return `?page=${safePage}&size=${safeSize}`;
}
