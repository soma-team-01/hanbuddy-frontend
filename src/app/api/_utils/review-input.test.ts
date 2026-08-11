import { describe, expect, it } from "vitest";
import { isValidReviewContent, isValidReviewRating } from "./review-input";

describe("review input validation", () => {
  it("accepts ratings between 1 and 5", () => {
    expect(isValidReviewRating(1)).toBe(true);
    expect(isValidReviewRating(5)).toBe(true);
    expect(isValidReviewRating(0)).toBe(false);
    expect(isValidReviewRating(6)).toBe(false);
    expect(isValidReviewRating(4.5)).toBe(false);
    expect(isValidReviewRating("5")).toBe(false);
    expect(isValidReviewRating(undefined)).toBe(false);
  });

  it("requires non-empty content within the length limit", () => {
    expect(isValidReviewContent("좋았습니다.")).toBe(true);
    expect(isValidReviewContent("a".repeat(1000))).toBe(true);
    expect(isValidReviewContent("a".repeat(1001))).toBe(false);
    expect(isValidReviewContent("   ")).toBe(false);
    expect(isValidReviewContent("")).toBe(false);
    expect(isValidReviewContent(5)).toBe(false);
  });
});
