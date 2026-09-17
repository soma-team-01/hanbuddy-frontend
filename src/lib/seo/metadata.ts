import type { Metadata } from "next";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import { APP_ORIGIN } from "@/lib/site";

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
  let images: string[] = [];
  if (image) {
    try {
      const imageUrl = new URL(image, APP_ORIGIN);
      if (["https:", "http:"].includes(imageUrl.protocol)) images = [imageUrl.href];
    } catch {
      /* Invalid optional image must not break the public document. */
    }
  }
  return {
    title: pageTitle,
    description: summary,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: "HanBuddy",
      title: pageTitle,
      description: summary,
      url,
      locale: getIntlLocale(locale).replace("-", "_"),
      images,
    },
    twitter: {
      card: images.length ? "summary_large_image" : "summary",
      title: pageTitle,
      description: summary,
      images,
    },
  };
}

export const unavailableMetadata: Metadata = { robots: { index: false, follow: false } };
