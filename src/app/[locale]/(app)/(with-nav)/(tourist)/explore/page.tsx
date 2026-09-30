import type { Metadata } from "next";
import { getPublicActivities, PublicActivityError } from "@/lib/server/public-activities";
import { publicPageMetadata, unavailableMetadata } from "@/lib/seo/metadata";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { ActivityFeed } from "./activity-feed";
import { ActivityDateFilter } from "@/components/activity/ActivityDateFilter";
import { isActivitySearchDate } from "@/lib/activity-booking-window";

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
  searchParams,
}: Readonly<{
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ date?: string | string[] }>;
}>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Explore" });

  const query = await searchParams;
  const date = Array.isArray(query?.date) ? query.date.join(",") : query?.date;
  const invalid = Boolean(date) && !isActivitySearchDate(date!);
  const activities = invalid ? [] : await getPublicActivities(locale, date || undefined);

  return (
    <>
      <PageHeader title={t("title")} />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <div className="relative z-10 mb-8 flex justify-start md:justify-end">
            <ActivityDateFilter key={date ?? ""} date={date} />
          </div>
          {!invalid ? (
            <ActivityFeed
              key={`${locale}-${date ?? ""}`}
              date={date}
              initialActivities={activities}
            />
          ) : null}
        </main>
      </PageContainer>
    </>
  );
}
