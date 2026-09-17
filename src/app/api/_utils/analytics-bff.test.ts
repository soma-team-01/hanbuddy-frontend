import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  analyticsContextForToken,
  analyticsUnavailableResponse,
  isAnalyticsContextCurrent,
  isConsentProof,
} from "./analytics-bff";

const signature = "A".repeat(43);
const grantedProof = `granted.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${signature}`;

describe("analytics BFF validation", () => {
  it("accepts only the requested choice and configured policy version for shaped proofs", () => {
    expect(isConsentProof(grantedProof, "granted", "policy_1")).toBe(true);
    expect(isConsentProof(grantedProof, "denied", "policy_1")).toBe(false);
    expect(isConsentProof(grantedProof, "granted", "other-policy")).toBe(false);
    expect(isConsentProof("pending.123", "granted", "policy_1")).toBe(false);
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
  expect(await response.json()).toEqual({
    isSuccess: false,
    code,
    message: "Analytics request unavailable",
  });
});
