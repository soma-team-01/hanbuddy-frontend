import type { Metadata } from "next";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import { APP_ORIGIN } from "@/lib/site";

/** 카카오톡·SNS 공유 미리보기에 쓰는 대표 이미지 (1200×630, 9/12 잠실 단체컷 + 로고·문구). */
export const DEFAULT_SHARE_IMAGE = {
  url: `${APP_ORIGIN}/images/og/hanbuddy-share.jpg`,
  width: 1200,
  height: 630,
  alt: "HanBuddy guests and buddies making finger hearts at a baseball night in Seoul",
} as const;

/** 페이지가 넘긴 사진은 주소만, 대표 이미지는 크기·대체 텍스트까지 함께 내보낸다. */
function resolveShareImage(image?: string | null): string | typeof DEFAULT_SHARE_IMAGE {
  if (image) {
    try {
      const imageUrl = new URL(image, APP_ORIGIN);
      if (["https:", "http:"].includes(imageUrl.protocol)) return imageUrl.href;
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
  image?: string | null;
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

export function publicPageMetadata({
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
  image?: string;
}): Metadata {
  const url = `${APP_ORIGIN}/${locale}${path}`;
  const pageTitle = `${title.trim()} | HanBuddy`;
  const summary = description.replace(/\s+/g, " ").trim().slice(0, 200);

  return {
    title: pageTitle,
    description: summary,
    alternates: { canonical: url },
    ...sharePreview({ locale, path, title: pageTitle, description: summary, image }),
  };
}

export const unavailableMetadata: Metadata = { robots: { index: false, follow: false } };
