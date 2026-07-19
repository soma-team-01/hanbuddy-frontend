import { getTranslations } from "next-intl/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
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
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <DashboardContent />

        <section className="flex flex-col gap-4 rounded-2xl bg-chip p-5">
          <h2 className="font-display text-xl font-semibold text-ink">{t("quickActions")}</h2>
          <Link
            href="/my-activities/create"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest-soft font-display text-sm font-semibold text-sage transition-colors hover:bg-forest"
          >
            <PlusIcon className="size-4" />
            {t("createActivity")}
          </Link>
        </section>
      </main>
    </>
  );
}
