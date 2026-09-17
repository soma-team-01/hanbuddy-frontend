import type { Metadata } from "next";
import { getPublicActivities, PublicActivityError } from "@/lib/server/public-activities";
import { publicPageMetadata, unavailableMetadata } from "@/lib/seo/metadata";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { ActivityFeed } from "./activity-feed";

export async function generateMetadata({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>): Promise<Metadata> {
  const { locale } = await params;
  try {
    await getPublicActivities(locale);
  } catch (error) {
    if (error instanceof PublicActivityError) return unavailableMetadata;
    throw error;
  }
  const t = await getTranslations({ locale, namespace: "Explore" });
  return publicPageMetadata({
    locale,
    path: "/explore",
    title: t("title"),
    description: t("description"),
  });
}

export default async function ExplorePage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Explore" });

  const activities = await getPublicActivities(locale);

  return (
    <>
      <PageHeader title={t("title")} />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <ActivityFeed key={locale} initialActivities={activities} />
        </main>
      </PageContainer>
    </>
  );
}
