import { getTranslations } from "next-intl/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import type { Locale } from "@/i18n/routing";
import { ApplicationsContent } from "./applications-content";

export default async function ApplicationsPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Applications" });

  return (
    <>
      <TopAppBar />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <h1 className="font-display text-2xl font-semibold text-forest">{t("title")}</h1>
        <ApplicationsContent />
      </main>
    </>
  );
}
