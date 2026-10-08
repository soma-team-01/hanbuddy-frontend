import { describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

vi.mock("server-only", () => ({}));

describe("policy page metadata", () => {
  it("declares its canonical URL and language alternates like other public pages", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: "ja", slug: "privacy-policy" }),
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://hanbuddy.kr/ja/policies/privacy-policy",
      languages: {
        en: "https://hanbuddy.kr/en/policies/privacy-policy",
        ko: "https://hanbuddy.kr/ko/policies/privacy-policy",
        ja: "https://hanbuddy.kr/ja/policies/privacy-policy",
        "zh-Hans": "https://hanbuddy.kr/zh-Hans/policies/privacy-policy",
        "zh-Hant": "https://hanbuddy.kr/zh-Hant/policies/privacy-policy",
        "x-default": "https://hanbuddy.kr/en/policies/privacy-policy",
      },
    });
  });
});
