import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyticsContextForToken,
  analyticsUnavailableResponse,
  isAnalyticsContextCurrent,
  isConsentProof,
  readAnalyticsOrigin,
  readServerAnalyticsPolicy,
} from "./analytics-bff";

const opaqueId = "A".repeat(43);
const grantedProof = `granted.v3.${opaqueId}`;

describe("analytics BFF validation", () => {
  it("accepts only the requested choice and canonical opaque IDs", () => {
    expect(isConsentProof(grantedProof, "granted")).toBe(true);
    expect(isConsentProof(grantedProof, "denied")).toBe(false);
    expect(isConsentProof(`granted.v3.${"A".repeat(42)}B`, "granted")).toBe(false);
    expect(isConsentProof("pending.123", "granted")).toBe(false);
  });

  it("derives a stable opaque context and rejects stale or malformed contexts", () => {
    const expected = createHash("sha256").update("access-token", "utf8").digest("hex");

    expect(analyticsContextForToken("access-token")).toBe(expected);
    expect(isAnalyticsContextCurrent(expected, "access-token")).toBe(true);
    expect(isAnalyticsContextCurrent(expected, "different-token")).toBe(false);
    expect(isAnalyticsContextCurrent("not-a-hash", "access-token")).toBe(false);
  });
});

it.each([
  [400, "ANALYTICS_INVALID"],
  [403, "ANALYTICS_FORBIDDEN"],
  [409, "ANALYTICS_CONTEXT_CHANGED"],
  [410, "ANALYTICS_REVOKED_OR_EXPIRED"],
  [415, "ANALYTICS_INVALID"],
  [502, "ANALYTICS_PROXY_ERROR"],
  [503, "ANALYTICS_DISABLED"],
] as const)("preserves safe analytics failure %s / %s", async (status, code) => {
  const response = analyticsUnavailableResponse(status);
  expect(response.status).toBe(status);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    isSuccess: false,
    code,
    message: "Analytics request unavailable",
  });
});

afterEach(() => vi.unstubAllEnvs());
it("uses the configured origin for collection and withdrawal even with collection disabled", () => {
  vi.stubEnv("GA4_ORIGIN", "https://staging.hanbuddy.kr");
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
  expect(readServerAnalyticsPolicy()?.origin).toBe("https://staging.hanbuddy.kr");
  vi.stubEnv("GA_ENABLED", "false");
  expect(readServerAnalyticsPolicy()).toBeNull();
  expect(readAnalyticsOrigin()).toBe("https://staging.hanbuddy.kr");
  vi.stubEnv("GA4_ORIGIN", "https://staging.hanbuddy.kr/path");
  expect(readAnalyticsOrigin()).toBeNull();
});
