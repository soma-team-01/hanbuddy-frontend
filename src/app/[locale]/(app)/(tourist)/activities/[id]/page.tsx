import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import { LOCALES, type Locale } from "@/i18n/routing";
import { isReviewLoginEnabled } from "@/lib/auth/review-login";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
import { publishedActivityLocales } from "@/lib/server/published-activities";
import { getPublicActivityReviewSummary } from "@/lib/server/public-reviews";
import { activityBreadcrumbs } from "@/lib/seo/activity-breadcrumbs";
import { activityProductJsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { activityShareImage, publicPageMetadata, unavailableMetadata } from "@/lib/seo/metadata";
import { ActivityDetailContent } from "./activity-detail-content";

type PageProps = Readonly<{
  params: Promise<{ id: string; locale: Locale }>;
  searchParams?: Promise<{ date?: string | string[] }>;
}>;

async function readActivity(id: string, locale: Locale) {
  try {
    return await getPublicActivity(id, locale);
  } catch (error) {
    if (error instanceof PublicActivityError && error.kind === "missing") notFound();
    throw error;
  }
}

/** 사이트맵과 같은 공개 언어로 hreflang을 만든다. 다른 언어 확인이 실패하면 5개 언어 전체로 둔다. */
async function hreflangLocales(id: string): Promise<readonly Locale[]> {
  try {
    return await publishedActivityLocales(id);
  } catch {
    return LOCALES;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, locale } = await params;
  try {
    const [activity, locales] = await Promise.all([readActivity(id, locale), hreflangLocales(id)]);
    return publicPageMetadata({
      locale,
      locales,
      path: `/activities/${activity.activityId}`,
      title: activity.title,
      description: activity.description,
      image: activityShareImage(activity.activityId, activity.title),
    });
  } catch (error) {
    if (error instanceof PublicActivityError && error.kind === "unavailable")
      return unavailableMetadata;
    throw error;
  }
}

export default async function ActivityDetailPage({ params, searchParams }: PageProps) {
  const { id, locale } = await params;
  const query = await searchParams;
  // 후기 미리보기는 기다리지 않고 promise로 넘긴다. 본문을 먼저 보내고 후기는 같은 HTML 응답 뒤쪽에
  // 이어 보내므로(크롤러는 끝까지 받아 읽는다) 후기 API가 느려도 본문이 붙잡히지 않는다.
  const initialReviews = getPublicActivityReviewSummary(id, locale);
  const [activity, navT] = await Promise.all([
    readActivity(id, locale),
    getTranslations({ locale, namespace: "Navigation" }),
  ]);
  const breadcrumbs = activityBreadcrumbs(
    { id: activity.activityId, title: activity.title },
    (key) => navT(key),
  );
  return (
    <>
      <JsonLd data={activityProductJsonLd(locale, activity)} />
      <JsonLd data={breadcrumbJsonLd(locale, breadcrumbs)} />
      <ActivityDetailContent
        key={`${locale}:${id}`}
        activityId={id}
        initialActivity={activity}
        initialReviews={initialReviews}
        preferredDate={typeof query?.date === "string" ? query.date : undefined}
        emailLoginEnabled={isReviewLoginEnabled()}
      />
    </>
  );
}
