export function isReviewLoginEnabled(value = process.env.REVIEW_LOGIN_ENABLED) {
  return value?.trim() === "true";
}
