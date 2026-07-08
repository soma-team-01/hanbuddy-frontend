import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";

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
