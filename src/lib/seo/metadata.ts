import type { Metadata } from "next";
import { getIntlLocale, LOCALES, type Locale } from "@/i18n/routing";
import { APP_ORIGIN } from "@/lib/site";

/** 카카오톡·SNS 공유 미리보기에 쓰는 대표 이미지 (1200×630, 9/12 잠실 단체컷 + 로고·문구). */
export const DEFAULT_SHARE_IMAGE = {
  url: `${APP_ORIGIN}/images/og/hanbuddy-share.jpg`,
  width: 1200,
  height: 630,
  alt: "HanBuddy guests and buddies making finger hearts at a baseball night in Seoul",
} as const;

export const ACTIVITY_SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** 활동 공유 이미지. 썸네일을 사이트 도메인 경로(/og/activities/{id}.jpg)에서 1200×630으로 내보낸다. */
export function activityShareImage(activityId: string | number, title: string): ShareImage {
  return {
    url: `${APP_ORIGIN}/og/activities/${activityId}.jpg`,
    ...ACTIVITY_SHARE_IMAGE_SIZE,
    alt: title,
  };
}

export interface ShareImage {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
}

/** 크기를 아는 사진(대표 이미지, 활동 공유 이미지)은 크기·대체 텍스트까지 함께 내보낸다. */
function resolveShareImage(image?: string | ShareImage | null): string | ShareImage {
  if (typeof image === "object" && image) return image;
  if (image) {
    try {
      const imageUrl = new URL(image, APP_ORIGIN);
      // 공유 미리보기는 https 이미지만 쓴다. http 주소는 대표 이미지로 대체한다.
      if (imageUrl.protocol === "https:") return imageUrl.href;
    } catch {
      /* Invalid optional image must not break the public document. */
    }
  }
  return DEFAULT_SHARE_IMAGE;
}

/**
 * 링크 공유 미리보기(Open Graph·Twitter) 정보. 제목은 브라우저 탭 제목과 같은 문자열을 넘긴다.
 * image가 없거나 잘못된 주소면 대표 이미지를 쓴다.
 */
export function sharePreview({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | ShareImage | null;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const shareImage = resolveShareImage(image);
  const summary = description.replace(/\s+/g, " ").trim().slice(0, 200);

  return {
    openGraph: {
      type: "website",
      siteName: "HanBuddy",
      title,
      description: summary,
      url: `${APP_ORIGIN}/${locale}${path}`,
      locale: getIntlLocale(locale).replace("-", "_"),
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [typeof shareImage === "string" ? shareImage : shareImage.url],
    },
  };
}

/**
 * 언어별 대체 주소(hreflang). 같은 내용의 다른 언어 주소와, 언어를 못 정한 방문자에게 보낼
 * x-default(기본은 넘긴 언어 중 첫 번째, 전체 언어면 영어)를 함께 선언한다. 다른 언어 주소가
 * 리다이렉트되는 화면(버디 모집)이나 일부 언어로만 공개된 활동은 실제로 열리는 언어만 넘긴다.
 */
export function languageAlternates(
  path: string,
  {
    locales = LOCALES,
    xDefault = locales[0],
  }: { locales?: readonly Locale[]; xDefault?: Locale } = {},
): Record<string, string> {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${APP_ORIGIN}/${locale}${path}`])),
    "x-default": `${APP_ORIGIN}/${xDefault}${path}`,
  };
}

/** canonical과 hreflang을 한 번에 만든다. 공개 페이지는 모두 이 함수를 거친다. */
export function pageAlternates(
  locale: Locale,
  path: string,
  options?: Parameters<typeof languageAlternates>[1],
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `${APP_ORIGIN}/${locale}${path}`,
    languages: languageAlternates(path, options),
  };
}

export function publicPageMetadata({
  locale,
  path,
  title,
  description,
  image,
  locales,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string | ShareImage;
  /** 일부 언어로만 공개된 페이지의 공개 언어. 보는 언어가 빠져 있으면 canonical만 남긴다. */
  locales?: readonly Locale[];
}): Metadata {
  const pageTitle = `${title.trim()} | HanBuddy`;
  const summary = description.replace(/\s+/g, " ").trim().slice(0, 200);

  return {
    title: pageTitle,
    description: summary,
    alternates:
      locales && !locales.includes(locale)
        ? { canonical: `${APP_ORIGIN}/${locale}${path}` }
        : pageAlternates(locale, path, { locales }),
    ...sharePreview({ locale, path, title: pageTitle, description: summary, image }),
  };
}

export const unavailableMetadata: Metadata = { robots: { index: false, follow: false } };

/** 로그인·결제·마이페이지 같은 비공개 화면. 응답 헤더(X-Robots-Tag)와 같은 값을 메타로도 남긴다. */
export const privatePageMetadata: Metadata = { robots: { index: false, follow: false } };
