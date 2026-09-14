import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { SettlementContent } from "./settlement-content";

export default async function SettlementPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Settlement" });

  return (
    <>
      <PageHeader title={t("title")} backHref="/dashboard" />
      <PageContainer className="flex-1 py-6 md:py-8">
        <main className="mx-auto w-full max-w-3xl">
          <SettlementContent />
        </main>
      </PageContainer>
    </>
  );
}
