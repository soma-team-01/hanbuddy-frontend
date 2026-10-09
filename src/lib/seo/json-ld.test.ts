import { describe, expect, it } from "vitest";
import type { TouristActivityDetail } from "@/types/activity";
import {
  activityProductJsonLd,
  breadcrumbJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  serializeJsonLd,
} from "./json-ld";

const NOW = Date.parse("2026-10-08T12:00:00+09:00");

function activity(overrides: Partial<TouristActivityDetail> = {}): TouristActivityDetail {
  return {
    activityId: 2,
    title: "⚾ Open-Air KBO Baseball Night",
    description: "Jamsil night game with a local buddy.",
    thumbnailImageUrl: "https://example.com/activities/2.webp",
    price: 70000,
    discountedPrice: null,
    currency: "KRW",
    averageRating: 4.9,
    reviewCount: 10,
    schedules: [],
    ...overrides,
  } as TouristActivityDetail;
}

function schedule(startAt: string, remainingCapacity = 4, status: "OPEN" | "CLOSED" = "OPEN") {
  return { activityScheduleId: 1, startAt, remainingCapacity, status };
}

describe("organizationJsonLd", () => {
  it("describes HanBuddy with the footer's legal name, contact email and social profiles", () => {
    const data = organizationJsonLd("ko");
    const [organization, website] = data["@graph"] as Record<string, unknown>[];

    expect(organization).toEqual({
      "@type": "Organization",
      "@id": "https://hanbuddy.kr/#organization",
      name: "HanBuddy",
      alternateName: "한버디",
      legalName: "제로원",
      url: "https://hanbuddy.kr/ko",
      logo: {
        "@type": "ImageObject",
        url: "https://hanbuddy.kr/images/brand/logo-borderless.webp",
        width: 512,
        height: 512,
      },
      email: "contact@hanbuddy.kr",
      sameAs: [
        "https://www.instagram.com/hanbuddy_kr/",
        "https://www.facebook.com/profile.php?id=61593105057939",
      ],
    });
    expect(website).toMatchObject({ "@type": "WebSite", url: "https://hanbuddy.kr/ko" });
    // 사이트 검색 주소가 없으므로 검색창(SearchAction)과 자기 평가 평점은 넣지 않는다.
    expect(JSON.stringify(data)).not.toMatch(/SearchAction|potentialAction|aggregateRating/);
  });
});

describe("activityProductJsonLd", () => {
  it("is in stock only while a schedule is open, has seats and is still bookable", () => {
    const availability = (schedules: ReturnType<typeof schedule>[]) =>
      (
        activityProductJsonLd("en", activity({ schedules }), NOW).offers as {
          availability: string;
        }
      ).availability;

    expect(availability([schedule("2026-10-12T18:30:00+09:00")])).toBe(
      "https://schema.org/InStock",
    );
    expect(availability([])).toBe("https://schema.org/SoldOut");
    expect(availability([schedule("2026-10-12T18:30:00+09:00", 0)])).toBe(
      "https://schema.org/SoldOut",
    );
    expect(availability([schedule("2026-10-12T18:30:00+09:00", 4, "CLOSED")])).toBe(
      "https://schema.org/SoldOut",
    );
    // 24시간 전 마감이 지난 회차는 예약할 수 없다.
    expect(availability([schedule("2026-10-09T08:00:00+09:00")])).toBe(
      "https://schema.org/SoldOut",
    );
  });

  it("uses the price shown on the page, including an active discount", () => {
    expect(activityProductJsonLd("en", activity(), NOW).offers).toMatchObject({
      price: "70000",
      priceCurrency: "KRW",
      url: "https://hanbuddy.kr/en/activities/2",
    });
    expect(
      activityProductJsonLd("en", activity({ discountedPrice: 63000 }), NOW).offers,
    ).toMatchObject({ price: "63000" });
  });

  it("copies the API rating and leaves the rating out when there are no reviews", () => {
    expect(activityProductJsonLd("ja", activity(), NOW).aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "10",
      bestRating: "5",
      worstRating: "1",
    });
    expect(
      activityProductJsonLd("ja", activity({ reviewCount: 0, averageRating: null }), NOW),
    ).not.toHaveProperty("aggregateRating");
    expect(
      activityProductJsonLd("ja", activity({ reviewCount: null, averageRating: null }), NOW),
    ).not.toHaveProperty("aggregateRating");
  });
});

describe("faqPageJsonLd and breadcrumbJsonLd", () => {
  it("keeps question and answer text exactly as given", () => {
    const data = faqPageJsonLd("en", [{ question: "Can I come alone?", answer: "Yes." }]);
    expect(data.mainEntity).toEqual([
      {
        "@type": "Question",
        name: "Can I come alone?",
        acceptedAnswer: { "@type": "Answer", text: "Yes." },
      },
    ]);
    expect(data.url).toBe("https://hanbuddy.kr/en/faq");
  });

  it("numbers breadcrumb items from the home page", () => {
    expect(
      breadcrumbJsonLd("zh-Hant", [
        { name: "Home", path: "" },
        { name: "FAQ", path: "/faq" },
      ]).itemListElement,
    ).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://hanbuddy.kr/zh-Hant" },
      { "@type": "ListItem", position: 2, name: "FAQ", item: "https://hanbuddy.kr/zh-Hant/faq" },
    ]);
  });
});

describe("serializeJsonLd", () => {
  it("cannot close the surrounding script tag and still parses back to the same data", () => {
    const data = { name: "</script><script>alert(1)</script>" };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(data);
  });
});
