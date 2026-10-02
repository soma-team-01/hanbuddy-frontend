import { describe, expect, it } from "vitest";
import { parseImportedReview, parseReviewFilters } from "./reviews";

const input = {
  reviewerName: "  ",
  rating: 5,
  content: "실제로 참여한 후기",
  originalReviewedAt: null,
  sourceReference: "legacy:42",
  reason: "원본 확인 후 이관",
};

describe("admin review validation", () => {
  it("keeps unknown names and dates null and strips unrelated input", () => {
    expect(parseImportedReview({ ...input, adminId: 2 }, true)).toEqual({
      ...input,
      reviewerName: null,
    });
  });
  it.each([
    { rating: "5" },
    { rating: 2.5 },
    { rating: 0 },
    { content: " " },
    { content: "a".repeat(1001) },
    { reason: " " },
    { reviewerName: 123 },
    { sourceReference: " " },
    { originalReviewedAt: "2026-02-30T10:00:00+09:00" },
    { originalReviewedAt: "2099-01-01T10:00:00+09:00" },
    { originalReviewedAt: "2020-01-01T10:00" },
  ])("rejects invalid import %j", (change) => {
    expect(() => parseImportedReview({ ...input, ...change }, true)).toThrow();
  });
  it("requires complete edits but does not permit changing the reference", () => {
    const result = parseImportedReview(input, false);
    expect(result).not.toHaveProperty("sourceReference");
    expect(() => parseImportedReview({ reason: "수정" }, false)).toThrow();
  });
  it("whitelists filters without content search", () => {
    expect(
      parseReviewFilters(
        new URLSearchParams("reviewerName=+Mina+&source=LEGACY_IMPORT&content=foo&page=0"),
      ),
    ).toEqual({ reviewerName: "Mina", source: "LEGACY_IMPORT", page: 0, size: 20 });
  });
  it.each([
    "reviewId=-1",
    "rating=6",
    "source=other",
    "createdFrom=2026-02-30",
    "createdFrom=2026-09-01&createdTo=2026-08-01",
  ])("rejects invalid filters %s", (query) => {
    expect(() => parseReviewFilters(new URLSearchParams(query))).toThrow();
  });
});
