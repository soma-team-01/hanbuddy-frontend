import { afterEach, describe, expect, it, vi } from "vitest";
import { isReviewLoginEnabled } from "./review-login";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isReviewLoginEnabled", () => {
  it("enables review login only for the explicit true value", () => {
    expect(isReviewLoginEnabled("true")).toBe(true);
    expect(isReviewLoginEnabled("false")).toBe(false);
    expect(isReviewLoginEnabled("TRUE")).toBe(false);
    expect(isReviewLoginEnabled(undefined)).toBe(false);
  });

  it("reads the server runtime environment by default", () => {
    vi.stubEnv("REVIEW_LOGIN_ENABLED", "true");

    expect(isReviewLoginEnabled()).toBe(true);
  });
});
