import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/JsonLd";
import type { Locale } from "@/i18n/routing";
import { isReviewLoginEnabled } from "@/lib/auth/review-login";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, locale } = await params;
  try {
    const activity = await readActivity(id, locale);
    return publicPageMetadata({
      locale,
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
        preferredDate={typeof query?.date === "string" ? query.date : undefined}
        emailLoginEnabled={isReviewLoginEnabled()}
      />
    </>
  );
}
