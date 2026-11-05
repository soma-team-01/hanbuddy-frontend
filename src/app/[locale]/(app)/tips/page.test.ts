import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTip, listTips } from "@/lib/server/tips-content";
import type { Tip } from "@/lib/tips/tip";
import TipsIndexPage, { generateMetadata as indexMetadata } from "./page";
import TipPage, { generateMetadata as tipMetadata, generateStaticParams } from "./[slug]/page";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/tips-content", () => ({ listTips: vi.fn(), getTip: vi.fn() }));
vi.mock("@/lib/server/tips-activities", () => ({ getRelatedActivities: vi.fn() }));

const TIP = {
  slug: "kbo-tickets",
  title: "How to Buy KBO Tickets as a Foreigner",
  description: "Book a seat online in minutes.",
  publishedAt: "2026-11-04",
  updatedAt: "2026-11-06",
  relatedActivityIds: [],
  body: "## Steps\n\nText.",
} satisfies Tip;

beforeEach(() => {
  vi.mocked(listTips).mockReset().mockResolvedValue([TIP]);
  vi.mocked(getTip).mockReset().mockResolvedValue(TIP);
});

describe("tips pages", () => {
  it.each(["ko", "ja", "zh-Hans", "zh-Hant", "xx"])(
    "return not found for the %s locale",
    async (locale) => {
      await expect(TipsIndexPage({ params: Promise.resolve({ locale }) })).rejects.toThrow(
        "NEXT_HTTP_ERROR_FALLBACK;404",
      );
      await expect(
        TipPage({ params: Promise.resolve({ locale, slug: TIP.slug }) }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(await indexMetadata({ params: Promise.resolve({ locale }) })).toEqual({});
      expect(await tipMetadata({ params: Promise.resolve({ locale, slug: TIP.slug }) })).toEqual(
        {},
      );
    },
  );

  it("returns not found for an unknown article", async () => {
    vi.mocked(getTip).mockResolvedValue(null);

    await expect(
      TipPage({ params: Promise.resolve({ locale: "en", slug: "missing" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("declares only the English canonical, with no hreflang for other locales", async () => {
    const metadata = await tipMetadata({
      params: Promise.resolve({ locale: "en", slug: TIP.slug }),
    });

    expect(metadata.title).toBe("How to Buy KBO Tickets as a Foreigner | HanBuddy");
    expect(metadata.alternates).toEqual({
      canonical: "https://hanbuddy.kr/en/tips/kbo-tickets",
      languages: {
        en: "https://hanbuddy.kr/en/tips/kbo-tickets",
        "x-default": "https://hanbuddy.kr/en/tips/kbo-tickets",
      },
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      title: "How to Buy KBO Tickets as a Foreigner | HanBuddy",
      description: "Book a seat online in minutes.",
      url: "https://hanbuddy.kr/en/tips/kbo-tickets",
      publishedTime: "2026-11-04",
      modifiedTime: "2026-11-06",
    });
  });

  it("lists static params from the article files and indexes the list only when it has articles", async () => {
    expect(await generateStaticParams()).toEqual([{ slug: "kbo-tickets" }]);
    expect(await indexMetadata({ params: Promise.resolve({ locale: "en" }) })).not.toHaveProperty(
      "robots",
    );

    vi.mocked(listTips).mockResolvedValue([]);
    expect(await generateStaticParams()).toEqual([]);
    expect(await indexMetadata({ params: Promise.resolve({ locale: "en" }) })).toMatchObject({
      robots: { index: false },
    });
  });
});
