import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlusIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
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
      <PageContainer className="flex-1 py-6 md:py-10">
        <main
          data-testid="dashboard-layout"
          className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
        >
          <DashboardContent />

          <section className="flex flex-col gap-4 rounded-2xl border border-line-soft bg-panel p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-display text-xl font-bold text-ink">{t("quickActions")}</h2>
            <Link
              href="/my-activities/create"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
            >
              <PlusIcon className="size-4" />
              {t("createActivity")}
            </Link>
          </section>
        </main>
      </PageContainer>
    </>
  );
}
