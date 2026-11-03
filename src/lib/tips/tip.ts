import { APP_ORIGIN } from "@/lib/site";

// Tips(정보 글)는 영어 전용이다. 다른 언어 주소는 프록시가 /en/tips로 보내고, 페이지도 404로 막는다.
export const TIPS_LOCALE = "en" as const;

export const TIP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface TipMeta {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** YYYY-MM-DD */
  readonly publishedAt: string;
  /** YYYY-MM-DD. 파일에 없으면 publishedAt과 같다. */
  readonly updatedAt: string;
  readonly relatedActivityIds: readonly number[];
}

export interface Tip extends TipMeta {
  readonly body: string;
}

export function isTipSlug(value: string): boolean {
  return TIP_SLUG_PATTERN.test(value);
}

/** 언어 접두사를 뺀 경로. 사이트맵·JSON-LD·빵부스러기가 같이 쓴다. */
export function tipsIndexPath(): string {
  return "/tips";
}

export function tipPath(slug: string): string {
  return `/tips/${slug}`;
}

export function tipUrl(slug: string): string {
  return `${APP_ORIGIN}/${TIPS_LOCALE}${tipPath(slug)}`;
}

/** 발행일 최신순. 같은 날이면 수정일 최신순, 그다음 슬러그 순서로 고정한다. */
export function compareTips(left: TipMeta, right: TipMeta): number {
  return (
    right.publishedAt.localeCompare(left.publishedAt) ||
    right.updatedAt.localeCompare(left.updatedAt) ||
    left.slug.localeCompare(right.slug)
  );
}

/** "2026-11-04" -> "November 4, 2026". 시간대에 흔들리지 않도록 UTC로 고정한다. */
export function formatTipDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
