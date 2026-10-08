import { describe, expect, it } from "vitest";
import nextConfig, { SECURITY_HEADERS } from "./next.config";

describe("nextConfig images.remotePatterns", () => {
  it("allows profile images only from the HanBuddy S3 bucket host", () => {
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      protocol: "https",
      hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
      pathname: "/profiles/**",
      search: "",
    });
  });

  it("allows activity images from the HanBuddy S3 bucket host", () => {
    expect(nextConfig.images?.remotePatterns).toContainEqual({
      protocol: "https",
      hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
      pathname: "/activities/**",
      search: "",
    });
  });
});

describe("nextConfig output file tracing", () => {
  it("includes policy documents for policy and onboarding routes", () => {
    expect(nextConfig.outputFileTracingIncludes).toEqual({
      "/*": ["content/policies/*.md"],
    });
  });
});

describe("nextConfig security headers", () => {
  it("hides the framework banner and sends the security headers on every route", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const rules = await nextConfig.headers!();
    expect(rules).toEqual([{ source: "/:path*", headers: [...SECURITY_HEADERS] }]);
    expect(Object.fromEntries(SECURITY_HEADERS.map(({ key, value }) => [key, value]))).toEqual({
      "Strict-Transport-Security": "max-age=31536000",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    });
  });
});
