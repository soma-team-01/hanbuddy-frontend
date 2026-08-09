import { describe, expect, it } from "vitest";
import { buildReviewPageQuery } from "./review-page-query";

function query(search: string) {
  return buildReviewPageQuery(new URLSearchParams(search));
}

describe("buildReviewPageQuery", () => {
  it("passes through valid pagination values", () => {
    expect(query("page=2&size=6")).toBe("?page=2&size=6");
    expect(query("page=0&size=1")).toBe("?page=0&size=1");
  });

  it("falls back to safe defaults for invalid values", () => {
    expect(query("")).toBe("?page=0&size=10");
    expect(query("page=-1&size=0")).toBe("?page=0&size=10");
    expect(query("page=abc&size=xyz")).toBe("?page=0&size=10");
    expect(query("page=1.5&size=2.5")).toBe("?page=0&size=10");
  });

  it("caps the page size so a single request cannot pull everything", () => {
    expect(query("page=0&size=500")).toBe("?page=0&size=50");
  });

  it("passes a valid star rating filter through", () => {
    expect(query("page=0&size=12&rating=5")).toBe("?page=0&size=12&rating=5");
    expect(query("page=0&size=12&rating=1")).toBe("?page=0&size=12&rating=1");
  });

  it("drops a rating outside the one-to-five range", () => {
    expect(query("page=0&size=12&rating=0")).toBe("?page=0&size=12");
    expect(query("page=0&size=12&rating=6")).toBe("?page=0&size=12");
    expect(query("page=0&size=12&rating=4.5")).toBe("?page=0&size=12");
    expect(query("page=0&size=12&rating=all")).toBe("?page=0&size=12");
    expect(query("page=0&size=12&rating=")).toBe("?page=0&size=12");
  });

  it("ignores unrelated query parameters", () => {
    expect(query("page=1&size=6&sort=rating&injected=%2Fadmin")).toBe("?page=1&size=6");
  });
});
