export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_CONTENT_MAX = 1000;

export function isValidReviewRating(rating: unknown): rating is number {
  return (
    typeof rating === "number" &&
    Number.isInteger(rating) &&
    rating >= REVIEW_RATING_MIN &&
    rating <= REVIEW_RATING_MAX
  );
}

export function isValidReviewContent(content: unknown): content is string {
  return (
    typeof content === "string" && content.trim().length > 0 && content.length <= REVIEW_CONTENT_MAX
  );
}
