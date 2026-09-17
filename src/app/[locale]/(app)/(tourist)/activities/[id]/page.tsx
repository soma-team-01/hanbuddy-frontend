import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import { getPublicActivity, PublicActivityError } from "@/lib/server/public-activities";
import { publicPageMetadata, unavailableMetadata } from "@/lib/seo/metadata";
import { ActivityDetailContent } from "./activity-detail-content";

type PageProps = Readonly<{ params: Promise<{ id: string; locale: Locale }> }>;

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
      image: activity.thumbnailImageUrl,
    });
  } catch (error) {
    if (error instanceof PublicActivityError && error.kind === "unavailable")
      return unavailableMetadata;
    throw error;
  }
}

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  const activity = await readActivity(id, locale);
  return (
    <ActivityDetailContent key={`${locale}:${id}`} activityId={id} initialActivity={activity} />
  );
}
