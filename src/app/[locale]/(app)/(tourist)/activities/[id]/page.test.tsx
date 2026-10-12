import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getPublicActivities,
  getPublicActivity,
  PublicActivityError,
} from "@/lib/server/public-activities";
import sitemap from "@/app/sitemap";
import { getPublicActivityReviewSummary } from "@/lib/server/public-reviews";
import type { ReviewPageResponse } from "@/types/review";
import { extractJsonLd } from "@/test/json-ld";
import Page, { generateMetadata } from "./page";
import { ActivityDetailContent } from "./activity-detail-content";
import type { TouristActivityDetail } from "@/types/activity";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/public-reviews", () => ({
  getPublicActivityReviewSummary: vi.fn(async () => undefined),
}));
vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
  ]);
  return {
    getTranslations: async ({ namespace }: { namespace: "Navigation" }) =>
      createTranslator({ locale: "en", messages: en, namespace }),
  };
});
vi.mock("@/lib/server/public-activities", async (original) => ({
  ...(await original<typeof import("@/lib/server/public-activities")>()),
  getPublicActivities: vi.fn(async () => [{ activityId: 42 }]),
  getPublicActivity: vi.fn(),
}));
const params = Promise.resolve({ id: "42", locale: "en" as const });
const ALL_LANGUAGES = {
  en: "https://hanbuddy.kr/en/activities/42",
  ko: "https://hanbuddy.kr/ko/activities/42",
  ja: "https://hanbuddy.kr/ja/activities/42",
  "zh-Hans": "https://hanbuddy.kr/zh-Hans/activities/42",
  "zh-Hant": "https://hanbuddy.kr/zh-Hant/activities/42",
  "x-default": "https://hanbuddy.kr/en/activities/42",
};
const activity = {
  activityId: 42,
  title: "Public walk",
  description: "A real public description.",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  price: 70000,
  discountedPrice: null,
  currency: "KRW",
  averageRating: 4.9,
  reviewCount: 10,
  schedules: [],
} as unknown as TouristActivityDetail;

function children(page: ReactElement): ReactNode[] {
  return Children.toArray((page.props as { children: ReactNode }).children);
}

/** 상호작용 화면(클라이언트 컴포넌트)에 넘기는 props. */
function contentProps(page: ReactElement) {
  const content = children(page).find(
    (child): child is ReactElement => isValidElement(child) && child.type === ActivityDetailContent,
  );
  return content!.props as {
    initialActivity: TouristActivityDetail;
    initialReviews: Promise<ReviewPageResponse | undefined>;
    emailLoginEnabled: boolean;
  };
}

/** 서버가 첫 HTML에 넣는 구조화 데이터만 그려서 파싱한다. */
function pageJsonLd(page: ReactElement) {
  const scripts = children(page).filter(
    (child): child is ReactElement => isValidElement(child) && child.type === JsonLd,
  );
  return extractJsonLd(renderToStaticMarkup(<>{scripts}</>));
}
beforeEach(() => {
  vi.mocked(getPublicActivities).mockReset();
  vi.mocked(getPublicActivities).mockResolvedValue([{ activityId: 42 }] as never);
});
describe("public detail document", () => {
  it("uses API data for metadata and passes the same content to the interactive view", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toBe("Public walk | HanBuddy");
    expect(metadata.description).toBe("A real public description.");
    expect(metadata.alternates?.canonical).toBe("https://hanbuddy.kr/en/activities/42");
    expect(metadata.alternates?.languages).toMatchObject({
      ko: "https://hanbuddy.kr/ko/activities/42",
      "x-default": "https://hanbuddy.kr/en/activities/42",
    });
    // 공유 미리보기는 S3 원본이 아니라 사이트 도메인의 1200×630 이미지다.
    expect(metadata.openGraph).toMatchObject({
      title: metadata.title,
      images: [
        {
          url: "https://hanbuddy.kr/og/activities/42.jpg",
          width: 1200,
          height: 630,
          alt: "Public walk",
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({
      title: metadata.title,
      description: metadata.description,
    });
    expect(contentProps(await Page({ params })).initialActivity).toBe(activity);
  });
  it("keeps all five languages for an activity published in every language", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.languages).toEqual(ALL_LANGUAGES);
  });
  it("declares only the languages the sitemap publishes, with the same x-default", async () => {
    // ja 목록에는 없고, zh-Hans 상세는 비공개로 확인된 활동.
    vi.mocked(getPublicActivities).mockImplementation(async (locale) =>
      locale === "ja" ? [] : ([{ activityId: 42 }] as never),
    );
    vi.mocked(getPublicActivity).mockImplementation(async (_, locale) => {
      if (locale === "zh-Hans") throw new PublicActivityError("missing");
      return activity;
    });
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates?.languages).toEqual({
      en: "https://hanbuddy.kr/en/activities/42",
      ko: "https://hanbuddy.kr/ko/activities/42",
      "zh-Hant": "https://hanbuddy.kr/zh-Hant/activities/42",
      "x-default": "https://hanbuddy.kr/en/activities/42",
    });
    const entry = (await sitemap()).find(
      ({ url }) => url === "https://hanbuddy.kr/en/activities/42",
    );
    expect(entry?.alternates?.languages).toEqual(metadata.alternates?.languages);

    // 영어로 공개되지 않으면 x-default도 사이트맵처럼 첫 공개 언어를 가리킨다.
    vi.mocked(getPublicActivities).mockImplementation(async (locale) =>
      locale === "ko" ? ([{ activityId: 42 }] as never) : [],
    );
    const korean = await generateMetadata({
      params: Promise.resolve({ id: "42", locale: "ko" as const }),
    });
    expect(korean.alternates).toEqual({
      canonical: "https://hanbuddy.kr/ko/activities/42",
      languages: {
        ko: "https://hanbuddy.kr/ko/activities/42",
        "x-default": "https://hanbuddy.kr/ko/activities/42",
      },
    });
  });
  it("leaves only the canonical when the viewed language is not a published one", async () => {
    vi.mocked(getPublicActivities).mockImplementation(async (locale) =>
      locale === "en" ? [] : ([{ activityId: 42 }] as never),
    );
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const metadata = await generateMetadata({ params });
    expect(metadata.alternates).toEqual({ canonical: "https://hanbuddy.kr/en/activities/42" });
  });
  it("falls back to all five languages when another language cannot be checked", async () => {
    vi.mocked(getPublicActivities).mockImplementation(async (locale) => {
      if (locale === "ja") throw new PublicActivityError("unavailable");
      return [{ activityId: 42 }] as never;
    });
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const metadata = await generateMetadata({ params });
    expect(metadata.title).toBe("Public walk | HanBuddy");
    expect(metadata.alternates?.languages).toEqual(ALL_LANGUAGES);
  });
  it("tells the interactive view whether the login popup may offer email login", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    expect(contentProps(await Page({ params })).emailLoginEnabled).toBe(false);
    vi.stubEnv("REVIEW_LOGIN_ENABLED", "true");
    expect(contentProps(await Page({ params })).emailLoginEnabled).toBe(true);
    vi.unstubAllEnvs();
  });
  it("puts Product and BreadcrumbList structured data built from the API into the first HTML", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const [product, breadcrumb] = pageJsonLd(await Page({ params }));
    expect(product).toMatchObject({
      "@type": "Product",
      name: "Public walk",
      description: "A real public description.",
      offers: {
        "@type": "Offer",
        price: "70000",
        priceCurrency: "KRW",
        availability: "https://schema.org/SoldOut",
      },
      aggregateRating: { ratingValue: "4.9", reviewCount: "10" },
    });
    expect(breadcrumb).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://hanbuddy.kr/en" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Explore",
          item: "https://hanbuddy.kr/en/explore",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Public walk",
          item: "https://hanbuddy.kr/en/activities/42",
        },
      ],
    });
  });
  it("hands the server-fetched review preview to the view so reviews are in the first HTML", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    const reviews = {
      averageRating: 4.9,
      totalCount: 10,
      reviews: [],
    } as unknown as ReviewPageResponse;
    vi.mocked(getPublicActivityReviewSummary).mockResolvedValueOnce(reviews);

    await expect(contentProps(await Page({ params })).initialReviews).resolves.toBe(reviews);
    expect(getPublicActivityReviewSummary).toHaveBeenCalledWith("42", "en");
  });
  it("still renders when the review preview could not be fetched on the server", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    vi.mocked(getPublicActivityReviewSummary).mockResolvedValueOnce(undefined);

    await expect(contentProps(await Page({ params })).initialReviews).resolves.toBeUndefined();
  });
  it("renders the activity body without waiting for a slow review preview", async () => {
    vi.mocked(getPublicActivity).mockResolvedValue(activity);
    // 후기 API가 응답하지 않아도 본문은 바로 그린다. 후기는 같은 HTML 응답 뒤쪽으로 이어서 보낸다.
    vi.mocked(getPublicActivityReviewSummary).mockReturnValueOnce(new Promise(() => {}));

    const page = await Page({ params });
    expect(contentProps(page).initialActivity).toBe(activity);
    expect(contentProps(page).initialReviews).toBeInstanceOf(Promise);
  });
  it("raises Next notFound for a confirmed missing activity in metadata and body", async () => {
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("missing"));
    await expect(Page({ params })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    await expect(generateMetadata({ params })).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
  it("keeps transient failure distinct from a missing resource", async () => {
    vi.mocked(getPublicActivity).mockRejectedValue(new PublicActivityError("unavailable"));
    await expect(Page({ params })).rejects.toMatchObject({ kind: "unavailable" });
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });
});
