import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { ApplicationsContent } from "./applications-content";

export default async function ApplicationsPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Applications" });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <ApplicationsContent />
        </main>
      </PageContainer>
    </>
  );
}
