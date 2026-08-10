import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { ActivityFeed } from "./activity-feed";

export default async function ExplorePage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Explore" });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <ActivityFeed />
        </main>
      </PageContainer>
    </>
  );
}
