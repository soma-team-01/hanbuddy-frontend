import { isBookingOpen } from "@/lib/activity-booking-window";
import { CONTACT_DETAILS, MEETUP_GROUP_URL } from "@/lib/contact-details";
import { APP_ORIGIN } from "@/lib/site";
import type { Locale } from "@/i18n/routing";
import type { TouristActivityDetail } from "@/types/activity";

// 구조화 데이터(JSON-LD)는 화면에 보이는 사실만 담는다. 값은 화면과 같은 출처(메시지 키·API 응답·상수)에서 만든다.

type JsonLdNode = Record<string, unknown>;

export const ORGANIZATION_ID = `${APP_ORIGIN}/#organization`;
const WEBSITE_ID = `${APP_ORIGIN}/#website`;
const BRAND_NAME = "HanBuddy";

/**
 * 메인: 서비스 운영 조직과 웹사이트. 사업자 상호(제로원)는 푸터의 사업자 정보와 같다. SearchAction은 넣지 않는다.
 * description은 메인 메타 설명과 같은 문장을 받는다. 검색엔진이 브랜드 정의를 Meetup 소개글보다 이 사이트에서 가져가게 한다.
 */
export function organizationJsonLd(locale: Locale, description: string): JsonLdNode {
  const url = `${APP_ORIGIN}/${locale}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: BRAND_NAME,
        alternateName: "한버디",
        legalName: "제로원",
        description,
        url,
        logo: {
          "@type": "ImageObject",
          url: `${APP_ORIGIN}/images/brand/logo-borderless.webp`,
          width: 512,
          height: 512,
        },
        email: CONTACT_DETAILS.email,
        sameAs: [CONTACT_DETAILS.instagramUrl, CONTACT_DETAILS.facebookUrl, MEETUP_GROUP_URL],
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: BRAND_NAME,
        alternateName: "한버디",
        url,
        inLanguage: locale,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export interface BreadcrumbItem {
  readonly name: string;
  /** 언어 접두사를 뺀 경로. 메인은 "". */
  readonly path: string;
}

export function breadcrumbJsonLd(locale: Locale, items: readonly BreadcrumbItem[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${APP_ORIGIN}/${locale}${item.path}`,
    })),
  };
}

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export function faqPageJsonLd(locale: Locale, entries: readonly FaqEntry[]): JsonLdNode {
  const url = `${APP_ORIGIN}/${locale}/faq`;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    url,
    inLanguage: locale,
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/** 지금 예약할 수 있는 회차(열림, 자리 남음, 24시간 전 마감 전)가 하나라도 있는지. 화면의 예약 가능 판단과 같다. */
export function hasBookableSchedule(activity: TouristActivityDetail, now = Date.now()): boolean {
  return activity.schedules.some(
    (schedule) =>
      schedule.status === "OPEN" &&
      schedule.remainingCapacity > 0 &&
      isBookingOpen(schedule.startAt, now),
  );
}

/** 활동 상세: 1인 가격(할인 중이면 할인가), 예약 가능 여부, 후기가 있을 때만 평점. */
export function activityProductJsonLd(
  locale: Locale,
  activity: TouristActivityDetail,
  now = Date.now(),
): JsonLdNode {
  const url = `${APP_ORIGIN}/${locale}/activities/${activity.activityId}`;
  const price = activity.discountedPrice ?? activity.price;
  const reviewCount = activity.reviewCount ?? 0;
  const rating = activity.averageRating;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: activity.title,
    description: activity.description,
    url,
    image: activity.thumbnailImageUrl,
    brand: { "@type": "Brand", name: BRAND_NAME },
    offers: {
      "@type": "Offer",
      url,
      price: String(price),
      priceCurrency: activity.currency,
      availability: hasBookableSchedule(activity, now)
        ? "https://schema.org/InStock"
        : "https://schema.org/SoldOut",
      seller: { "@type": "Organization", "@id": ORGANIZATION_ID, name: BRAND_NAME },
    },
    ...(reviewCount > 0 && typeof rating === "number"
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(rating),
            reviewCount: String(reviewCount),
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
  };
}

/** <script> 안에 넣을 문자열. `<`를 이스케이프해 문서 안에서 태그가 닫히지 않게 한다. */
export function serializeJsonLd(data: JsonLdNode): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
