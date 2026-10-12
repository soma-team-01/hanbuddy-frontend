import { beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import robots from "./robots";
import {
  getPublicActivities,
  getPublicActivity,
  PublicActivityError,
} from "@/lib/server/public-activities";
import type { TouristActivityDetail, TouristActivitySummary } from "@/types/activity";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-activities", async (original) => ({
  ...(await original<typeof import("@/lib/server/public-activities")>()),
  getPublicActivities: vi.fn(),
  getPublicActivity: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getPublicActivities).mockReset();
  vi.mocked(getPublicActivity).mockReset();
});
describe("public sitemap and crawl policy", () => {
  it("lists unique public canonical URLs and skips missing/deleted detail candidates", async () => {
    vi.mocked(getPublicActivities).mockResolvedValue(
      [1, 2, 3, 1].map((activityId) => ({ activityId }) as TouristActivitySummary),
    );
    vi.mocked(getPublicActivity).mockImplementation(async (id) => {
      if (id === "3") throw new PublicActivityError("missing");
      return {
        activityId: Number(id),
        isSoldOut: id === "2",
        schedules: [],
      } as unknown as TouristActivityDetail;
    });
    const urls = (await sitemap()).map(({ url }) => url);
    expect(urls).toContain("https://hanbuddy.kr/en");
    expect(urls).toContain("https://hanbuddy.kr/en/explore");
    expect(urls).toContain("https://hanbuddy.kr/en/about");
    expect(urls).toContain("https://hanbuddy.kr/zh-Hant/about");
    expect(urls).toContain("https://hanbuddy.kr/en/faq");
    expect(urls).toContain("https://hanbuddy.kr/zh-Hant/faq");
    expect(urls).toContain("https://hanbuddy.kr/en/activities/1");
    expect(urls).toContain("https://hanbuddy.kr/ko/activities/2");
    expect(urls).toContain("https://hanbuddy.kr/ko/buddy");
    expect(urls).not.toContain("https://hanbuddy.kr/en/buddy");
    expect(urls.some((url) => url.endsWith("/3"))).toBe(false);
    expect(urls.every((url) => !/login|book|payments|admin|my-page|\?/.test(url))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("adds lastmod, language alternates with an English x-default, and public policy pages", async () => {
    vi.mocked(getPublicActivities).mockResolvedValue([{ activityId: 2 } as TouristActivitySummary]);
    vi.mocked(getPublicActivity).mockResolvedValue({
      activityId: 2,
    } as unknown as TouristActivityDetail);
    const entries = await sitemap();
    const byUrl = new Map(entries.map((entry) => [entry.url, entry]));

    expect(byUrl.get("https://hanbuddy.kr/ko/faq")).toEqual({
      url: "https://hanbuddy.kr/ko/faq",
      lastModified: "2026-10-06",
      alternates: {
        languages: {
          en: "https://hanbuddy.kr/en/faq",
          ko: "https://hanbuddy.kr/ko/faq",
          ja: "https://hanbuddy.kr/ja/faq",
          "zh-Hans": "https://hanbuddy.kr/zh-Hans/faq",
          "zh-Hant": "https://hanbuddy.kr/zh-Hant/faq",
          "x-default": "https://hanbuddy.kr/en/faq",
        },
      },
    });
    const policyUrls = entries.map(({ url }) => url).filter((url) => url.includes("/policies/"));
    expect(policyUrls).toHaveLength(15);
    expect(policyUrls).toContain("https://hanbuddy.kr/zh-Hant/policies/cancellation-refund-policy");
    expect(policyUrls.some((url) => /buddy-|consent-notices|community-safety/.test(url))).toBe(
      false,
    );
    expect(byUrl.get("https://hanbuddy.kr/ko/buddy")?.alternates?.languages).toEqual({
      ko: "https://hanbuddy.kr/ko/buddy",
      "x-default": "https://hanbuddy.kr/ko/buddy",
    });
    const activity = byUrl.get("https://hanbuddy.kr/ja/activities/2");
    expect(activity?.lastModified).toBeUndefined();
    expect(activity?.alternates?.languages?.["x-default"]).toBe(
      "https://hanbuddy.kr/en/activities/2",
    );
    expect(
      entries.filter(({ url }) => !url.includes("/activities/")).every((e) => e.lastModified),
    ).toBe(true);
    // 5 locales x (home, about, faq, explore, 3 policies, activity 2) + ko/buddy
    expect(entries).toHaveLength(5 * 8 + 1);
  });

  it("uses each language's activity update time as its lastmod", async () => {
    vi.mocked(getPublicActivities).mockResolvedValue([{ activityId: 6 } as TouristActivitySummary]);
    vi.mocked(getPublicActivity).mockImplementation(
      async (id, locale) =>
        ({
          activityId: Number(id),
          ...(locale === "ja"
            ? {}
            : {
                updatedAt:
                  locale === "ko"
                    ? "2026-10-12T09:00:00+09:00"
                    : "2026-10-11T23:03:38.593286+09:00",
              }),
        }) as unknown as TouristActivityDetail,
    );
    const byUrl = new Map((await sitemap()).map((entry) => [entry.url, entry]));

    expect(byUrl.get("https://hanbuddy.kr/en/activities/6")?.lastModified).toBe(
      "2026-10-11T23:03:38.593286+09:00",
    );
    expect(byUrl.get("https://hanbuddy.kr/ko/activities/6")?.lastModified).toBe(
      "2026-10-12T09:00:00+09:00",
    );
    expect(byUrl.get("https://hanbuddy.kr/ja/activities/6")).not.toHaveProperty("lastModified");
    expect(byUrl.get("https://hanbuddy.kr/ko/activities/6")?.alternates?.languages).toEqual(
      byUrl.get("https://hanbuddy.kr/en/activities/6")?.alternates?.languages,
    );
  });

  it("fails instead of publishing an empty success sitemap during an API outage", async () => {
    vi.mocked(getPublicActivities).mockRejectedValue(new PublicActivityError("unavailable"));
    await expect(sitemap()).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("does not hide detail transport failures as deletion", async () => {
    vi.mocked(getPublicActivities).mockResolvedValue([{ activityId: 1 } as TouristActivitySummary]);
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("unavailable"));
    await expect(sitemap()).rejects.toMatchObject({ kind: "unavailable" });
  });
  it("advertises the canonical sitemap without blocking noindex documents or adding bot policy", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://hanbuddy.kr/sitemap.xml",
    });
  });
});
