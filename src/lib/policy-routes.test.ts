import { describe, expect, it } from "vitest";
import { getPolicyPath, POLICY_SLUGS, resolvePolicyDocumentHref } from "./policy-routes";

describe("policy routes", () => {
  it("exposes every public policy under the current locale", () => {
    expect(POLICY_SLUGS).toEqual([
      "terms-of-service",
      "privacy-policy",
      "cancellation-refund-policy",
      "buddy-operation-terms",
      "buddy-commission-settlement-policy",
      "community-safety-policy",
      "consent-notices",
    ]);
    expect(getPolicyPath("ko", "terms-of-service")).toBe("/ko/policies/terms-of-service");
  });

  it("rewrites links between the source documents and leaves external URLs unchanged", () => {
    expect(resolvePolicyDocumentHref("ja", "./terms-of-service.ja.md#example")).toBe(
      "/ja/policies/terms-of-service#example",
    );
    expect(resolvePolicyDocumentHref("ko", "./cancellation-refund-policy.ko.md")).toBe(
      "/ko/policies/cancellation-refund-policy",
    );
    expect(resolvePolicyDocumentHref("ko", "./terms-of-service.ko.md#section#details")).toBe(
      "/ko/policies/terms-of-service#section#details",
    );
    expect(resolvePolicyDocumentHref("ko", "https://example.com/policy")).toBe(
      "https://example.com/policy",
    );
  });
});
