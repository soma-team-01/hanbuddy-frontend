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
    expect(urls).toContain("https://hanbuddy.kr/en/activities/1");
    expect(urls).toContain("https://hanbuddy.kr/ko/activities/2");
    expect(urls).toContain("https://hanbuddy.kr/ko/buddy");
    expect(urls).not.toContain("https://hanbuddy.kr/en/buddy");
    expect(urls.some((url) => url.endsWith("/3"))).toBe(false);
    expect(urls.every((url) => !/login|book|payments|admin|my-page|\?/.test(url))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
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
