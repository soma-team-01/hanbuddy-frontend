import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import type { Locale } from "@/i18n/routing";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BuddyDashboard" });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <PageContainer className="flex-1 py-6 md:py-8">
        {/* 사이드 패널 없이 한 컬럼 — 운영 정보가 한 화면에 담기도록 압축한다 */}
        <main data-testid="dashboard-layout" className="mx-auto w-full max-w-4xl">
          <DashboardContent />
        </main>
      </PageContainer>
    </>
  );
}
